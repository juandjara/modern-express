const controller = require('./controller');
const Router = require('express').Router;
const router = new Router();
const projectController = require('../project/controller')

const checkPermission = projectController.userIsMember()

router.post('/',
  checkPermission,
  (...args) => controller.create(...args));

router.get('/by_project/:projectId',
  checkPermission,
  (...args) => controller.findByProject(...args))

router.get('/by_asignee/:userId',
  checkPermission,
  (...args) => controller.findByAsignee(...args))

router.route('/:id')
  .get((...args) => controller.findById(...args))
  .put(
    checkPermission,
    (...args) => controller.update(...args)
  )
  .delete(
    checkPermission,
    (...args) => controller.remove(...args)
  );

router.endpoint = '/task'

module.exports = router;
