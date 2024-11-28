import { sign } from 'jsonwebtoken';
import { microservicesurl } from './config';
export const JWT_SECRET = 'JHS@1234';
export const REFRESH_JWT_SECRET = "JHS@12345";
import moment from 'moment';
//export const JWT_HOURS = 24;
//export const jwtExpirySeconds = 3600 * JWT_HOURS; // 8 hours


export async function generateToken(user) {

    //const now = new Date();
   // now.setHours(now.getHours() + 8)
   // let expires_in = ((JWT_HOURS * 60) - 30) * 60 * 60
   // let jwtExpirySeconds = (3600 * JWT_HOURS) //- 1800

    let expires_in = moment().add(microservicesurl.JWT_HOURS, 'h').unix() * 1000;
    let jwtExpirySeconds = (3600 * microservicesurl.JWT_HOURS); //- 1800
    try {
        const token = await sign({ username: user }, JWT_SECRET,
            {
                algorithm: 'HS256',
                expiresIn: jwtExpirySeconds//"30d"//
            }
        );
        const refreshToken = await sign({ username: user }, REFRESH_JWT_SECRET, {
            algorithm: 'HS256'
        });
        let tokenKeys = {
            tokenkey: await sign({}, JWT_SECRET,
                {
                    algorithm: 'HS256',
                    expiresIn: jwtExpirySeconds
                }
            ),
            refreshtokenkey: await sign({}, REFRESH_JWT_SECRET, {
                algorithm: 'HS256'
            })
        }
        return { token, refreshToken, expires_in,...tokenKeys };
    } catch (error) {
        return error
    }
}