const express = require('express');
const router = express.Router();

const ContentController = require('../controllers/ContentController');
const contentController = new ContentController();

// Content Routes
router.get('/content/articles', (req, res) => contentController.getArticles(req, res));
router.get('/content/categories/:id', (req, res) => contentController.getCategory(req, res));

const UserController = require('../controllers/UserController');
const userController = new UserController();

// User Routes
router.get('/user/get', (req, res) => userController.getUser(req, res));
router.delete('/user/delete', (req, res) => userController.deleteUser(req, res));
router.post('/user/create', (req, res) => userController.createUser(req, res));
router.put('/user/update', (req, res) => userController.updateUser(req, res));
router.get('/user/me', (req, res) => userController.getMe(req, res));
router.post('/user/login', (req, res) => userController.login(req, res));

// Profile Routes
const ProfileController = require('../controllers/ProfileController');
const profileController = new ProfileController();

router.get('/profile/get', (req, res) => profileController.getProfiles(req, res));
router.post('/profile/create', (req, res) => profileController.createProfile(req, res));
router.post('/profile/verify-institution', (req, res) => profileController.verifyInstitution(req, res));
router.put('/profile/update/:profileId', (req, res) => profileController.updateProfile(req, res));
router.delete('/profile/delete/:profileId', (req, res) => profileController.deleteProfile(req, res));

// Subject Routes
const SubjectController = require('../controllers/SubjectController');
const subjectController = new SubjectController();

router.get('/subject/get', (req, res) => subjectController.getSubjects(req, res));
router.get('/exam/get', (req, res) => subjectController.getExams(req, res));

// Session Routes
const SessionController = require('../controllers/SessionController');
const sessionController = new SessionController();

router.post('/session/find-or-create', (req, res) => sessionController.findOrCreateSession(req, res));
router.get('/session/get', (req, res) => sessionController.getSessions(req, res));

// UserTopic Routes
const UserTopicController = require('../controllers/UserTopicController');
const userTopicController = new UserTopicController();

router.post('/user-topic/find-or-create', (req, res) => userTopicController.findOrCreateUserTopic(req, res));
router.get('/user-topic/get', (req, res) => userTopicController.getUserTopics(req, res));
router.delete('/user-topic/delete/:userTopicId', (req, res) => userTopicController.deleteUserTopic(req, res));

// Topic Routes
const TopicController = require('../controllers/TopicController');
const TeacherController = require('../controllers/TeacherController');
const topicController = new TopicController();
const teacherController = new TeacherController();

router.post('/topic/create', (req, res) => topicController.createTopic(req, res));
router.get('/topic/get', (req, res) => topicController.getTopics(req, res));
router.delete('/topic/delete/:documentId', (req, res) => topicController.deleteTopic(req, res));

// Analysis Routes
const AnalysisController = require('../controllers/AnalysisController');
const analysisController = new AnalysisController();

router.post('/analysis/create', (req, res) => analysisController.createAnalysis(req, res));
router.get('/analysis/get', (req, res) => analysisController.getAnalyses(req, res));

// Classroom Routes
const ClassroomController = require('../controllers/ClassroomController');
const classroomController = new ClassroomController();

router.get('/classroom/get', (req, res) => classroomController.getClassrooms(req, res));
router.get('/classroom/by-code/:classCode', (req, res) => classroomController.getByCode(req, res));
router.post('/classroom/create', (req, res) => classroomController.createClassroom(req, res));
router.put('/classroom/update/:id', (req, res) => classroomController.updateClassroom(req, res));
router.post('/teacher/assign-topic', (req, res) => teacherController.assignTopicToClass(req, res));
router.get('/teacher/topic-stats', (req, res) => teacherController.getTopicStats(req, res));

module.exports = router;
