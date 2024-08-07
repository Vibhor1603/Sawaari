const express = require('express')
const router = express.Router()
const {home,hotspots,routes,ridebuddy, findmatch ,users} = require('../controller/controller')

router.route('/').get(home)
router.route('/hotspots').get(hotspots)
router.route('/routes').post(routes)
router.route('/ridebuddy').post(ridebuddy)
router.route('/findmatch').get(findmatch)
router.route('/users').post(users)

module.exports = router;