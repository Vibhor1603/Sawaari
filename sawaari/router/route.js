const express = require('express')
const router = express.Router()
const {home,hotspots,routes,ridebuddy } = require('../controller/controller')

router.route('/').get(home)
router.route('/hotspots').get(hotspots)
router.route('/routes').get(routes)
router.route('/ridebuddy').get(ridebuddy)

module.exports = router;