import { Request, Response, Router } from 'express'
import { handlerWrapper } from '../errors/AppError'
import { fetchProposalById, fetchProposalVoteCount, fetchProposalVotes, fetchProposals } from '../repository/proposal'
import { formatProposal, validateHash, validateVoter } from '../helpers/validator'
import { GovActionStateTypes, ProposalTypes, SortTypes } from '../types/proposal'

const router = Router()

const getProposals = async (req: Request, res: Response) => {
    const size = req.query.size ? +req.query.size : 10
    const page = req.query.page ? +req.query.page : 1
    const type = req.query.type
        ? Array.isArray(req.query.type)
            ? (req.query.type as ProposalTypes[])
            : typeof req.query.type === 'string'
            ? req.query.type.split(',').map((type) => type as ProposalTypes)
            : undefined
        : undefined
    const sort = req.query.sort ? (req.query.sort as SortTypes) : undefined
    const state = req.query.state ? (req.query.state as GovActionStateTypes) : undefined
    const includeVoteCount = 'true' == (req.query.vote_count as string)
    let proposal = req.query.proposal as string

    if (proposal) {
        if (!validateHash(proposal)) {
            return res.status(400).json({ message: 'Provide valid proposal Id' })
        }
        proposal = proposal.includes('#') ? proposal.split('#')[0] : proposal
    }
    const { items, totalCount } = await fetchProposals(page, size, proposal, type, sort, state, includeVoteCount)
    return res.status(200).json({ totalCount: totalCount, page, size, items })
}

const getProposalVoteCount = async (req: Request, res: Response) => {
    const proposal = formatProposal(req.params.id as string)
    let voter
    if (req.params.voter) {
        voter = validateVoter(req.params.voter as string)
    }
    if (!proposal) {
        return res.status(400).json({ message: 'Provide valid govAction Id (hash#index) or bech32' })
    }
    const totalVoteCount = await fetchProposalVoteCount(proposal.id, proposal.ix, voter)
    return res.status(200).json(totalVoteCount)
}

const getProposalVotes = async (req: Request, res: Response) => {
    const proposal = formatProposal(req.params.id as string)
    const includeVotingPower = 'true' == (req.query.voting_power as string)
    if (!proposal) {
        return res.status(400).json({ message: 'Provide valid govAction Id (hash#index) or bech32' })
    }
    const votes = await fetchProposalVotes(proposal.id, proposal.ix, includeVotingPower)
    return res.status(200).json(votes)
}

const getProposalById = async (req: Request, res: Response) => {
    const proposal = formatProposal(req.params.id as string)
    const includeVoteCount = 'true' == (req.query.vote_count as string)
    if (!proposal) {
        return res.status(400).json({ message: 'Provide valid govAction Id (hash#index) or bech32' })
    }
    const proposalDetails = await fetchProposalById(proposal.id, proposal.ix, includeVoteCount)
    if (!proposalDetails) return res.status(404).json(proposalDetails)
    return res.status(200).json(proposalDetails)
}

router.get('/', handlerWrapper(getProposals))
router.get('/:id/vote-count', handlerWrapper(getProposalVoteCount))
router.get('/:id/vote-count/:voter', handlerWrapper(getProposalVoteCount))
router.get('/:id/votes', handlerWrapper(getProposalVotes))
router.get('/:id', handlerWrapper(getProposalById))

export default router
