import { Request, Response, Router } from 'express'
import { handlerWrapper } from '../errors/AppError'
import { fetchBlockInfo, fetchCommitteeGovState, fetchEpochDuration, fetchEpochParams } from '../repository/blockchain'

const router = Router()

const getEpochDuration = async (req: Request, res: Response): Promise<any> => {
    const limit = parseInt(req.query.limit as string)
    const result = await fetchEpochDuration(limit || 5)
    return res.status(200).json(result)
}

const getEpochParams = async (req: Request, res: Response): Promise<any> => {
    const epoch_no = req.query.epoch_no as string
    const result = await fetchEpochParams(parseInt(epoch_no) ? parseInt(epoch_no) : undefined)
    return res.status(200).json(result)
}

const getCommitteeGovState = async (req: Request, res: Response): Promise<any> => {
    const result = await fetchCommitteeGovState()
    return res.status(200).json(result)
}

const getBlockInfo = async (req: Request, res: Response): Promise<any> => {
    const blockNo = !isNaN(parseInt(req.query.block_no as string)) ? parseInt(req.query.block_no as string) : undefined
    const limit = !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : undefined
    const result = await fetchBlockInfo(limit, blockNo)
    if (!result) return res.status(404).json(null)
    return res.status(200).json(result)
}

router.get('/epoch', handlerWrapper(getEpochDuration))
router.get('/epoch/params', handlerWrapper(getEpochParams))
router.get('/gov-state/committee', handlerWrapper(getCommitteeGovState))
router.get('/block', handlerWrapper(getBlockInfo))

export default router
