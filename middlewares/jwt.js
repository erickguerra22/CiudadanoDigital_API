import jwt from 'jsonwebtoken'
import moment from 'moment'
import config from 'config'
import consts from '../utils/consts.js'

const key = config.get('jwtKey')

const signAccessToken = ({ userId, deviceId, email, names, lastnames, refreshId }) => {
  const expiresAt = moment().add(consts.tokenExpiration.access_hours_expiration, 'hour').unix()
  const token = jwt.sign(
    {
      userId,
      deviceId,
      email,
      names,
      lastnames,
      refreshId,
      exp: expiresAt,
      type: consts.token.access,
    },
    key
  )
  return { token, expiresAt }
}

const signRegisterToken = ({ id, name, lastname, email, sex }) =>
  jwt.sign(
    {
      id,
      name,
      lastname,
      email,
      sex,
      exp: moment().add(consts.tokenExpiration.register_months_expiration, 'month').unix(),
      type: consts.token.register,
    },
    key
  )

const signRecoverPasswordToken = ({ id, name, lastname, email }) => {
  const expiresAt = moment().add(consts.tokenExpiration.recover_minutes_expiration, 'minute').unix()
  const token = jwt.sign(
    {
      id,
      name,
      lastname,
      email,
      exp: expiresAt,
      type: consts.token.recover,
    },
    key
  )
  return { token, expiresAt }
}

const validateToken = async (token) => jwt.verify(token, key)

export { signAccessToken, signRegisterToken, validateToken, signRecoverPasswordToken }
