const controller = require('./controller');
const Router = require('express').Router;
const router = new Router();

router.route('/')
  .get((...args) => controller.paginate(...args))
  .post((...args) => controller.create(...args));

router.route('/:id')
  .put((...args) => controller.update(...args))
  .get((...args) => controller.findById(...args))
  .delete((...args) => controller.remove(...args));

router.route('/company/:companyId')
  .get((...args) => controller.findByCompanyId(...args))

router.route('/:id/user/:userId')
  .put((...args) => controller.addUser(...args))
  .delete((...args) => controller.deleteUser(...args))


router.endpoint = "/project"

module.exports = router;
