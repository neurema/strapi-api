#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

const repoEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(repoEnvPath)) {
    dotenv.config({ path: repoEnvPath });
} else {
    dotenv.config();
}

const config = require('../config');

const FALLBACK_OFFSETS = [0, 1, 3, 7, 14, 30, 60, 90];

function parseArgs(argv) {
    const result = {
        profileId: null,
        mode: 'effective',
        dryRun: false,
        limit: null,
        baseUrl: null,
        nd: null,
        ns: null,
        dailyTopicLimit: 12,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--profile-id') {
            result.profileId = argv[i + 1] || null;
            i += 1;
        } else if (arg === '--mode') {
            result.mode = (argv[i + 1] || 'effective').toLowerCase();
            i += 1;
        } else if (arg === '--base-url') {
            result.baseUrl = argv[i + 1] || null;
            i += 1;
        } else if (arg === '--limit') {
            const parsed = Number.parseInt(argv[i + 1] || '', 10);
            result.limit = Number.isFinite(parsed) ? parsed : null;
            i += 1;
        } else if (arg === '--nd') {
            const parsed = Number.parseInt(argv[i + 1] || '', 10);
            result.nd = Number.isFinite(parsed) ? parsed : null;
            i += 1;
        } else if (arg === '--ns') {
            const parsed = Number.parseInt(argv[i + 1] || '', 10);
            result.ns = Number.isFinite(parsed) ? parsed : null;
            i += 1;
        } else if (arg === '--daily-topic-limit') {
            const parsed = Number.parseInt(argv[i + 1] || '', 10);
            result.dailyTopicLimit = Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
            i += 1;
        } else if (arg === '--dry-run') {
            result.dryRun = true;
        }
    }

    return result;
}

function resolveStayBaseUrl(mode, explicitBaseUrl) {
    if (explicitBaseUrl) {
        return explicitBaseUrl;
    }
    if (mode.includes('crunch')) {
        return process.env.CRUNCH_API_BASE || process.env.EFFICIENT_API_BASE || null;
    }
    return process.env.EFFICIENT_API_BASE || process.env.CRUNCH_API_BASE || null;
}

function difficultyFromMinutes(minutes) {
    if (minutes >= 40) return 0.85;
    if (minutes >= 30) return 0.75;
    if (minutes >= 25) return 0.65;
    if (minutes >= 20) return 0.55;
    return 0.45;
}

function resolveNd(explicitNd) {
    if (Number.isFinite(explicitNd) && explicitNd > 0) {
        return explicitNd;
    }

    const examDateIso = process.env.EXAM_DATE;
    if (examDateIso) {
        const examDate = new Date(examDateIso);
        if (!Number.isNaN(examDate.getTime())) {
            const diffMs = examDate.getTime() - Date.now();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays > 0) {
                return diffDays;
            }
        }
    }

    return 180;
}

function resolveNs(explicitNs, nd, dailyTopicLimit) {
    if (Number.isFinite(explicitNs) && explicitNs > 0) {
        return explicitNs;
    }
    const horizonWeeks = Math.max(1, Math.ceil(nd / 7));
    return dailyTopicLimit * horizonWeeks;
}

function minutesFromUserTopic(userTopic) {
    const candidates = [
        userTopic?.timeTotal,
        userTopic?.timeRemaining,
        userTopic?.topic?.minutes,
    ];
    for (const candidate of candidates) {
        const parsed = Number.parseInt(candidate ?? '', 10);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return 25;
}

function buildTopicPayload(userTopic, subjectName, opts) {
    const topic = userTopic?.topic || {};
    const subject = `${subjectName || ''}`.trim();
    const topicName = `${topic.name || ''}`.trim();
    if (!subject || !topicName) {
        throw new Error('Missing resolved subject or topic.name');
    }

    const minutes = minutesFromUserTopic(userTopic);
    const nd = resolveNd(opts.nd);
    const ns = resolveNs(opts.ns, nd, opts.dailyTopicLimit);
    const payload = {
        subject_tag: `${subject}::${topicName}`,
        difficulty: difficultyFromMinutes(minutes),
        add_day: 0,
        rt_ratio: Math.max(0.5, Math.min(1.5, minutes / Math.max(minutes, 1))),
        accuracy: 0.9,
        nd,
        ns,
        tmin_label: 'Major',
    };

    const bubbleId = `${topic.section || ''}`.trim();
    if (bubbleId) {
        payload.bubble_id = bubbleId;
    }

    return payload;
}

async function fetchSubjectByTopic(strapiClient, topicId) {
    if (!topicId) {
        return null;
    }

    const response = await strapiClient.get('/api/subjects', {
        params: {
            'fields[0]': 'name',
            'populate[topics][fields][0]': 'id',
            'populate[topics][filters][id][$eq]': String(topicId),
            'pagination[pageSize]': '1',
        },
    });

    const subjects = response?.data?.data || [];
    if (!subjects.length) {
        return null;
    }

    const subject = subjects[0];
    return `${subject?.name || ''}`.trim() || null;
}

async function registerBubbleIfNeeded(stayClient, bubbleId) {
    if (!bubbleId) {
        return;
    }
    try {
        await stayClient.post('/topics/bubbles', {
            bubble_id: bubbleId,
            values: FALLBACK_OFFSETS,
            relative: true,
        });
    } catch (error) {
        if (error.response?.status === 409) {
            return;
        }
        throw error;
    }
}

async function fetchAllUserTopics(strapiClient, profileId) {
    const results = [];
    let page = 1;
    let pageCount = 1;

    while (page <= pageCount) {
        const params = {
            'fields[0]': 'documentId',
            'fields[1]': 'timeTotal',
            'fields[2]': 'timeRemaining',
            'populate[topic][fields][0]': 'id',
            'populate[topic][fields][1]': 'name',
            'populate[topic][fields][2]': 'section',
            'pagination[page]': String(page),
            'pagination[pageSize]': '100',
        };

        if (profileId) {
            params['filters[profile][id][$eq]'] = String(profileId);
        }

        const response = await strapiClient.get('/api/user-topics', { params });
        const data = response?.data?.data || [];
        const meta = response?.data?.meta?.pagination || {};
        pageCount = Number.parseInt(meta.pageCount ?? '1', 10) || 1;
        results.push(...data);
        page += 1;
    }

    return results;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const stayBaseUrl = resolveStayBaseUrl(options.mode, options.baseUrl);
    if (!stayBaseUrl) {
        throw new Error('Missing EFFICIENT_API_BASE/CRUNCH_API_BASE. Pass --base-url or set env.');
    }
    if (!config.strapiUrl || !config.contentApiToken) {
        throw new Error('Missing STRAPI_URL or STRAPI_CONTENT_API_TOKEN for Strapi access.');
    }

    const strapiClient = axios.create({
        baseURL: config.strapiUrl.replace('localhost', '127.0.0.1'),
        timeout: 60000,
        headers: {
            Authorization: `Bearer ${config.contentApiToken}`,
            'Content-Type': 'application/json',
        },
    });

    const stayClient = axios.create({
        baseURL: stayBaseUrl.replace(/\/$/, ''),
        timeout: 60000,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const userTopics = await fetchAllUserTopics(strapiClient, options.profileId);
    const missing = userTopics.filter((item) => !item?.stayTopicId);
    const targets =
        Number.isFinite(options.limit) && options.limit > 0
            ? missing.slice(0, options.limit)
            : missing;

    const summary = {
        scanned: userTopics.length,
        missing: missing.length,
        targeted: targets.length,
        updated: 0,
        skipped: 0,
        dryRun: options.dryRun,
        failures: [],
    };

    for (const userTopic of targets) {
        const documentId = userTopic?.documentId;
        try {
            if (!documentId) {
                throw new Error('Missing user-topic documentId');
            }

            const topicId = userTopic?.topic?.id;
            const subjectName = await fetchSubjectByTopic(strapiClient, topicId);
            if (!subjectName) {
                throw new Error(`Could not resolve subject for topic ${topicId || 'unknown'}`);
            }

            const payload = buildTopicPayload(userTopic, subjectName, options);
            if (payload.bubble_id) {
                await registerBubbleIfNeeded(stayClient, payload.bubble_id);
            }

            const stayResponse = await stayClient.post('/topics/', payload);
            const stayTopicId = stayResponse?.data?.id?.toString().trim() || '';
            if (!stayTopicId) {
                throw new Error('Stay API returned no topic id');
            }

            if (!options.dryRun) {
                await strapiClient.put(`/api/user-topics/${documentId}`, {
                    data: {
                        stayTopicId,
                    },
                });
            }

            summary.updated += 1;
            console.log(
                `[backfill] ${documentId} -> ${stayTopicId} (${payload.subject_tag})`
            );
        } catch (error) {
            summary.failures.push({
                documentId,
                topicName: userTopic?.topic?.name || null,
                topicId: userTopic?.topic?.id || null,
                error: error.response?.data || error.message,
            });
            console.error(
                `[backfill] failed ${documentId || 'unknown'}:`,
                error.response?.data || error.message
            );
        }
    }

    summary.skipped = summary.targeted - summary.updated - summary.failures.length;
    console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
    console.error(error.response?.data || error.message || error);
    process.exit(1);
});
