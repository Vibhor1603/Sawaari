const express = require('express')
const router = express.Router()
const {home,hotspots,feedbacks, findmatch,signUp,ridebuddy, signIn} = require('../controller/controller')

router.route('/').get(home)
router.route('/hotspots').get(hotspots)
router.route('/feedbacks').post(feedbacks)
router.route('/ridebuddy').post(ridebuddy)
router.route('/findmatch').get(findmatch)
router.route('/signup').post(signUp)
router.route('/signin').post(signIn)

module.exports = router;