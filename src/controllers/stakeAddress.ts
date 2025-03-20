import { Request, Response, Router } from 'express'
import { handlerWrapper } from '../errors/AppError'
import { convertToHexIfBech32, validateAddress } from '../helpers/validator'
import { fetchStakeAddressDetails } from '../repository/stakeAddress'

const router = Router()

const getStakeAddressDetails = async (req: Request, res: Response): Promise<any> => {
    let address = convertToHexIfBech32(req.query.address as string)
    if (validateAddress(address)) {
        if (address.length == 56) {
            return res.status(400).json({ mesage: `Provide a valid address` })
        }
    } else {
        return res.status(400).json({ message: 'Provide a valid address' })
    }

    const result = await fetchStakeAddressDetails(address)
    return res.status(200).json(result)
}

router.get('/', handlerWrapper(getStakeAddressDetails))

export default router
