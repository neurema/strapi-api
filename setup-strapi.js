#!/usr/bin/env node
/**
 * Strapi Collection Setup Script
 *
 * This script creates all the required collections, attributes, and relations
 * in Strapi that the neurema middleware API expects.
 *
 * Usage:
 *   node setup-strapi.js
 *
 * Environment variables (from Doppler):
 *   STRAPI_URL              - Strapi admin URL (default: http://localhost:1337)
 *   STRAPI_CONTENT_API_TOKEN - Content API token with full permissions
 */

// Use native fetch (Node.js 18+)
const { fetch } = globalThis;

// Configuration
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const ADMIN_TOKEN = process.env.STRAPI_CONTENT_API_TOKEN;

if (!ADMIN_TOKEN) {
    console.error('Error: STRAPI_CONTENT_API_TOKEN environment variable is required');
    console.error('Make sure it is set in Doppler');
    process.exit(1);
}

// Helper: Make authenticated fetch request
async function strapiRequest(method, path, body = null) {
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const url = `${STRAPI_URL}${path}`;
    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const error = new Error(data?.error?.message || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return { data, status: response.status };
}

// Collection definitions
const COLLECTIONS = {
    // 1. institutes - for institutional email domains
    'institutes': {
        displayName: 'Institute',
        pluralName: 'institutes',
        singularName: 'institute',
        attributes: [
            { name: 'name', type: 'string', required: true },
            { name: 'emaildomain', type: 'string', required: true },
            { name: 'color', type: 'string' },
        ],
    },

    // 2. exams - exam types (NEET-PG, etc)
    'exams': {
        displayName: 'Exam',
        pluralName: 'exams',
        singularName: 'exam',
        attributes: [
            { name: 'name', type: 'string', required: true },
        ],
    },

    // 3. subjects - subjects linked to exams
    'subjects': {
        displayName: 'Subject',
        pluralName: 'subjects',
        singularName: 'subject',
        attributes: [
            { name: 'name', type: 'string', required: true },
        ],
        relations: [
            { name: 'exams', type: 'manyToMany', target: 'exam', withOwner: false },
        ],
    },

    // 4. topics - study topics
    'topics': {
        displayName: 'Topic',
        pluralName: 'topics',
        singularName: 'topic',
        attributes: [
            { name: 'name', type: 'string', required: true },
            { name: 'section', type: 'string' },
        ],
        relations: [
            { name: 'subject', type: 'manyToOne', target: 'subject', withOwner: false },
            { name: 'ownerProfile', type: 'manyToOne', target: 'profile', withOwner: true },
        ],
    },

    // 5. profiles - user profiles with study settings
    'profiles': {
        displayName: 'Profile',
        pluralName: 'profiles',
        singularName: 'profile',
        attributes: [
            { name: 'examType', type: 'string' },
            { name: 'examDate', type: 'datetime' },
            { name: 'studyMode', type: 'string' },
            { name: 'isInstituteLinked', type: 'boolean' },
            { name: 'collegeEmail', type: 'email' },
            { name: 'year', type: 'string' },
            { name: 'rollNo', type: 'string' },
            { name: 'dailyTopicLimit', type: 'integer' },
            { name: 'defaultSessionDuration', type: 'integer' },
            { name: 'vivaCount', type: 'integer' },
        ],
        relations: [
            { name: 'user', type: 'oneToOne', target: 'plugin::users-permissions.user', withOwner: false },
            { name: 'institute', type: 'manyToOne', target: 'institute', withOwner: false },
            { name: 'classroom', type: 'manyToMany', target: 'classroom', withOwner: false },
        ],
    },

    // 6. classrooms - study groups/classes
    'classrooms': {
        displayName: 'Classroom',
        pluralName: 'classrooms',
        singularName: 'classroom',
        attributes: [
            { name: 'name', type: 'string', required: true },
            { name: 'classCode', type: 'string', required: true, unique: true },
            { name: 'examDate', type: 'datetime' },
        ],
        relations: [
            { name: 'institute', type: 'manyToOne', target: 'institute', withOwner: false },
            { name: 'teachers', type: 'manyToMany', target: 'plugin::users-permissions.user', withOwner: false },
            { name: 'students', type: 'manyToMany', target: 'profile', withOwner: false },
            { name: 'topics', type: 'manyToMany', target: 'topic', withOwner: false },
            { name: 'exam', type: 'manyToOne', target: 'exam', withOwner: false },
        ],
    },

    // 7. user-topics - user's study progress on topics
    'user-topics': {
        displayName: 'User Topic',
        pluralName: 'user-topics',
        singularName: 'user-topic',
        attributes: [
            { name: 'memoryLocation', type: 'string' },
            { name: 'lastSession', type: 'datetime' },
            { name: 'nextSession', type: 'datetime' },
            { name: 'timeTotal', type: 'integer' },
            { name: 'timeRemaining', type: 'integer' },
            { name: 'revisionsDone', type: 'integer' },
            { name: 'teacherInstructions', type: 'text' },
        ],
        relations: [
            { name: 'topic', type: 'manyToOne', target: 'topic', withOwner: false },
            { name: 'profile', type: 'manyToOne', target: 'profile', withOwner: false },
        ],
    },

    // 8. study-sessions - individual study sessions
    'study-sessions': {
        displayName: 'Study Session',
        pluralName: 'study-sessions',
        singularName: 'study-session',
        attributes: [
            { name: 'isPaused', type: 'boolean' },
            { name: 'scheduledFor', type: 'datetime' },
            { name: 'timeTakenForRevision', type: 'integer' },
            { name: 'timeTakenForActivity', type: 'integer' },
            { name: 'timeAllotted', type: 'integer' },
            { name: 'scoreActivity', type: 'string' },
            { name: 'difficultyLevel', type: 'string' },
        ],
        relations: [
            { name: 'user_topic', type: 'manyToOne', target: 'user-topic', withOwner: false },
        ],
    },

    // 9. analyses - session analysis results
    'analyses': {
        displayName: 'Analysis',
        pluralName: 'analyses',
        singularName: 'analysis',
        attributes: [
            { name: 'weakPoints', type: 'text' },
            { name: 'blindSpots', type: 'text' },
            { name: 'strongPoints', type: 'text' },
            { name: 'metrics', type: 'text' },
            { name: 'areaOfImprovement', type: 'text' },
            { name: 'transcription', type: 'text' },
        ],
        relations: [
            { name: 'study_session', type: 'oneToOne', target: 'study-session', withOwner: false },
        ],
    },
};

// Helper: Check if content type exists
async function contentTypeExists(uid) {
    try {
        await strapiRequest('GET', `/api/content-type-builder/content-types/${encodeURIComponent(uid)}`);
        return true;
    } catch (error) {
        if (error.status === 404) return false;
        throw error;
    }
}

// Helper: Get existing attributes for a content type
async function getExistingAttributes(uid) {
    try {
        const response = await strapiRequest('GET', `/api/content-type-builder/content-types/${encodeURIComponent(uid)}`);
        const schema = response.data.data;
        // Strapi v4/v5 structure varies - handle both
        const attributes = schema?.schema?.attributes || schema?.attributes || {};
        return attributes;
    } catch (error) {
        if (error.status === 404) return {};
        console.error(`Error fetching attributes for ${uid}:`, error.data || error.message);
        return {};
    }
}

// Helper: Create collection type
async function createCollectionType(key, def) {
    const uid = `api::${key}.${key}`;

    console.log(`\n[${key}] Creating collection type...`);

    if (await contentTypeExists(uid)) {
        console.log(`[${key}] Already exists, skipping creation`);
        return false;
    }

    const attributes = [...def.attributes];

    // Add media attribute for institutes
    if (key === 'institutes') {
        attributes.push({
            name: 'logo',
            type: 'media',
            multiple: false,
            required: false,
            allowedTypes: ['images'],
        });
    }

    // Add relations
    if (def.relations) {
        for (const rel of def.relations) {
            attributes.push({
                name: rel.name,
                type: 'relation',
                relation: rel.type,
                target: rel.target,
                mappedBy: rel.mappedBy,
                inversedBy: rel.inversedBy,
                private: false,
                configurable: true,
            });
        }
    }

    const payload = {
        contentType: {
            displayName: def.displayName,
            pluralName: def.pluralName,
            singularName: def.singularName,
            displayNameSingular: def.displayName,
            displayNamePlural: def.pluralName,
            subject: def.displayName,
            settings: {
                searchable: true,
                filterable: true,
                bulkable: true,
                pageSize: 25,
                defaultPageSize: 25,
            },
            attributes: attributes.reduce((acc, attr) => {
                acc[attr.name] = attr;
                return acc;
            }, {}),
        },
    };

    try {
        await strapiRequest('POST', '/api/content-type-builder/content-types', payload);
        console.log(`[${key}] Created successfully`);
        return true;
    } catch (error) {
        if (error.data?.error?.message?.includes('already exists')) {
            console.log(`[${key}] Already exists`);
            return false;
        }
        console.error(`[${key}] Error:`, error.data || error.message);
        throw error;
    }
}

// Helper: Update collection to add missing attributes
async function updateCollectionAttributes(key, def) {
    console.log(`\n[${key}] Checking attributes...`);

    const uid = `api::${key}.${key}`;

    try {
        // Get existing attributes
        const existingAttrs = await getExistingAttributes(uid);
        const existingAttrNames = Object.keys(existingAttrs);

        console.log(`[${key}] Existing attributes: ${existingAttrNames.join(', ') || 'none'}`);

        const attributes = [...def.attributes];

        // Add media for institutes if missing
        if (key === 'institutes' && !existingAttrNames.includes('logo')) {
            attributes.push({
                name: 'logo',
                type: 'media',
                multiple: false,
                required: false,
                allowedTypes: ['images'],
            });
        }

        // Check relations
        if (def.relations) {
            for (const rel of def.relations) {
                if (!existingAttrNames.includes(rel.name)) {
                    attributes.push({
                        name: rel.name,
                        type: 'relation',
                        relation: rel.type,
                        target: rel.target,
                        private: false,
                        configurable: true,
                    });
                    console.log(`[${key}] Will add missing relation: ${rel.name} (${rel.type})`);
                }
            }
        }

        // Check regular attributes
        const missingAttrs = attributes.filter(attr => !existingAttrNames.includes(attr.name));

        if (missingAttrs.length === 0) {
            console.log(`[${key}] All attributes present - nothing to add`);
            return false;
        }

        console.log(`[${key}] Missing attributes: ${missingAttrs.map(a => a.name).join(', ')}`);
        console.log(`[${key}] Adding ${missingAttrs.length} missing attributes...`);

        // Update the content type with new attributes
        const updatePayload = {
            contentType: {
                attributes: missingAttrs.reduce((acc, attr) => {
                    acc[attr.name] = attr;
                    return acc;
                }, {}),
            },
        };

        await strapiRequest('PUT', `/api/content-type-builder/content-types/${encodeURIComponent(uid)}`, updatePayload);
        console.log(`[${key}] Attributes added successfully`);
        return true;

    } catch (error) {
        // 404 means the collection doesn't exist yet
        if (error.status === 404) {
            console.log(`[${key}] Collection does not exist, will need to be created`);
            return false;
        }
        console.error(`[${key}] Error:`, error.data || error.message);
        throw error;
    }
}

// Helper: Force sync - try to ensure all attributes exist regardless of collection state
async function forceSyncAttributes(key, def) {
    console.log(`\n[${key}] Force syncing attributes...`);

    const uid = `api::${key}.${key}`;

    try {
        const existingAttrs = await getExistingAttributes(uid);
        const existingAttrNames = Object.keys(existingAttrs);

        const allAttributes = [...def.attributes];

        // Add media for institutes
        if (key === 'institutes') {
            allAttributes.push({
                name: 'logo',
                type: 'media',
                multiple: false,
                required: false,
                allowedTypes: ['images'],
            });
        }

        // Add relations
        if (def.relations) {
            for (const rel of def.relations) {
                allAttributes.push({
                    name: rel.name,
                    type: 'relation',
                    relation: rel.type,
                    target: rel.target,
                    private: false,
                    configurable: true,
                });
            }
        }

        // Get missing
        const missingAttrs = allAttributes.filter(attr => !existingAttrNames.includes(attr.name));

        if (missingAttrs.length === 0) {
            console.log(`[${key}] All attributes already exist`);
            return false;
        }

        console.log(`[${key}] Adding missing: ${missingAttrs.map(a => a.name).join(', ')}`);

        const updatePayload = {
            contentType: {
                attributes: missingAttrs.reduce((acc, attr) => {
                    acc[attr.name] = attr;
                    return acc;
                }, {}),
            },
        };

        await strapiRequest('PUT', `/api/content-type-builder/content-types/${encodeURIComponent(uid)}`, updatePayload);
        console.log(`[${key}] Sync complete`);
        return true;

    } catch (error) {
        if (error.status === 404) {
            console.log(`[${key}] Does not exist yet - create first`);
            return false;
        }
        console.error(`[${key}] Sync error:`, error.data || error.message);
        return false;
    }
}

// Main setup function
async function setup() {
    const forceSync = process.argv.includes('--force') || process.argv.includes('-f');
    const diffMode = process.argv.includes('--diff') || process.argv.includes('-d');

    console.log('='.repeat(60));
    console.log('Strapi Collection Setup Script');
    console.log('='.repeat(60));
    console.log(`\nStrapi URL: ${STRAPI_URL}`);

    if (diffMode) {
        console.log('Mode: DIFF (showing differences only, no changes will be made)');
    } else if (forceSync) {
        console.log('Mode: FORCE SYNC (will try to add missing attributes even if collection exists)');
    } else {
        console.log('Mode: NORMAL (create missing collections, sync existing)');
    }

    try {
        // Test connection
        console.log('\nTesting connection...');
        await strapiRequest('GET', '/api/content-type-builder/content-types');
        console.log('Connection successful');

        if (diffMode) {
            // Diff mode: just show what would be added/changed
            console.log('\n--- Checking Collections ---');
            for (const [key, def] of Object.entries(COLLECTIONS)) {
                await diffCollection(key, def);
            }
        } else if (forceSync) {
            // Force sync mode
            console.log('\n--- Force Syncing Attributes ---');
            for (const [key, def] of Object.entries(COLLECTIONS)) {
                await forceSyncAttributes(key, def);
            }
        } else {
            // Normal mode
            console.log('\n--- Creating Missing Collections ---');
            for (const [key, def] of Object.entries(COLLECTIONS)) {
                await createCollectionType(key, def);
            }

            console.log('\n--- Syncing Attributes on Existing Collections ---');
            for (const [key, def] of Object.entries(COLLECTIONS)) {
                await updateCollectionAttributes(key, def);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('Setup Complete!');
        console.log('='.repeat(60));

        console.log(`
Collections processed:
${Object.keys(COLLECTIONS).map(k => `  - ${k}`).join('\n')}

Usage:
  node setup-strapi.js           # Normal mode - create missing, sync incomplete
  node setup-strapi.js --force  # Force sync - add missing attributes to existing
  node setup-strapi.js --diff    # Show what would be added (no changes)

Next steps:
1. Restart Strapi to load new schemas
2. Go to Strapi Admin > Settings > Users & Permissions
3. Enable public access for the new content types, or
4. Create API tokens with appropriate permissions
`);

    } catch (error) {
        console.error('\nSetup failed:', error.data || error.message);
        if (error.status === 401) {
            console.error('\nAuthentication failed. Make sure your STRAPI_CONTENT_API_TOKEN is valid');
        }
        process.exit(1);
    }
}

// Helper: Show diff of what would be added
async function diffCollection(key, def) {
    const uid = `api::${key}.${key}`;

    console.log(`\n[${key}]`);

    try {
        const existingAttrs = await getExistingAttributes(uid);
        const existingAttrNames = Object.keys(existingAttrs);

        if (existingAttrNames.length === 0) {
            console.log(`  Status: Collection does not exist`);
            console.log(`  Action: Would CREATE with attributes:`);
            def.attributes.forEach(attr => console.log(`    + ${attr.name} (${attr.type})`));
            if (def.relations) {
                def.relations.forEach(rel => console.log(`    + ${rel.name} (${rel.type} -> ${rel.target})`));
            }
            return;
        }

        console.log(`  Status: Collection exists with ${existingAttrNames.length} attributes`);

        const attributes = [...def.attributes];

        // Media
        if (key === 'institutes' && !existingAttrNames.includes('logo')) {
            attributes.push({ name: 'logo', type: 'media' });
        }

        // Relations
        const missingRelations = [];
        if (def.relations) {
            for (const rel of def.relations) {
                if (!existingAttrNames.includes(rel.name)) {
                    missingRelations.push(rel);
                }
            }
        }

        // Regular attributes
        const missingAttrs = attributes.filter(attr => !existingAttrNames.includes(attr.name));

        if (missingAttrs.length > 0) {
            console.log(`  Missing attributes:`);
            missingAttrs.forEach(attr => console.log(`    + ${attr.name} (${attr.type})`));
        }

        if (missingRelations.length > 0) {
            console.log(`  Missing relations:`);
            missingRelations.forEach(rel => console.log(`    + ${rel.name} (${rel.type} -> ${rel.target})`));
        }

        if (missingAttrs.length === 0 && missingRelations.length === 0) {
            console.log(`  Status: All attributes and relations present`);
        }

    } catch (error) {
        if (error.status === 404) {
            console.log(`  Status: Collection does not exist`);
            console.log(`  Action: Would CREATE`);
        } else {
            console.error(`  Error:`, error.data || error.message);
        }
    }
}

// Run
setup();