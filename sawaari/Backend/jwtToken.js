const jwt = require('jsonwebtoken');

const generateAccessToken = (user)=> {
  const payload = {
    email: user.Email
  };
  
  const secret = 'PROJECT SAWAARI';
  const options = { expiresIn: 180 };

  return jwt.sign(payload, secret, options);
}

const verifyAccessToken = (token)=> {
  const secret = 'PROJECT SAWAARI';

  try {
    const decoded = jwt.verify(token, secret);
    return true
  } catch (error) {
    return false
  }
}

module.exports = {generateAccessToken,verifyAccessToken}