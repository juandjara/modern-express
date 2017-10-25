const controller = require('./controller');
const Router = require('express').Router;
const router = new Router();

router.route('/:projectId')
  .get((...args) => controller.paginate(...args))
  .post((...args) => controller.create(...args));

router.route('/:projectId/:id')
  .put((...args) => controller.update(...args))
  .get((...args) => controller.findById(...args))
  .delete((...args) => controller.remove(...args));

router.endpoint = '/task'

module.exports = router;
