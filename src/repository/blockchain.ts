import { Prisma } from '@prisma/client'
import { prisma } from '../config/db'
import { convertKeysToCamelCase } from '../helpers/validator'

export async function fetchEpochDuration(limit: number) {
    const result = (await prisma.$queryRaw`
        select e.no, e.start_time, e.end_time from epoch e order by e.id desc limit ${limit};
    `) as Record<string, any>[]

    type EpochDurationResponse = {
        epoch: number
        duration: string // in milliseconds
        startTime: string
        endTime: string
    }

    const parsedResult: EpochDurationResponse[] = result.map((epoch) => ({
        epoch: epoch.no,
        duration: (
            BigInt(new Date(epoch.end_time).getTime()) - BigInt(new Date(epoch.start_time).getTime())
        ).toString(),
        startTime: epoch.start_time,
        endTime: epoch.end_time,
    }))

    return parsedResult
}

export async function fetchEpochParams(epoch_no?: number) {
    const result = (await prisma.$queryRaw`
            SELECT
                jsonb_set(
                    ROW_TO_JSON(epoch_param)::jsonb,
                    '{cost_model}', 
                    CASE
                        WHEN cost_model.id IS NOT NULL THEN
                            ROW_TO_JSON(cost_model)::jsonb
                        ELSE
                            'null'::jsonb
                    END
                ) AS epoch_param
            FROM
                epoch_param
            LEFT JOIN
                cost_model ON epoch_param.cost_model_id = cost_model.id
            WHERE epoch_no = ${epoch_no ? epoch_no : Prisma.sql`(SELECT no from epoch order by no desc limit 1)`}
            LIMIT 1;`) as Record<string, any>[]
    return result[0].epoch_param
}

export async function fetchCommitteeGovState() {
    const result = (await prisma.$queryRaw`
        WITH PreviosActionId AS 
            (
            SELECT 
                CASE 
                    WHEN ENCODE(tx.hash, 'hex') = '' OR gap.index IS NULL THEN NULL
                    ELSE ENCODE(tx.hash, 'hex') || '#' || gap.index::TEXT
                END AS hash_index
            FROM gov_action_proposal gap
            JOIN tx ON tx.id = gap.tx_id
            JOIN block b ON b.id = tx.block_id
            WHERE gap.id = (
                SELECT gap.prev_gov_action_proposal 
                FROM gov_action_proposal gap 
                WHERE gap.type = 'NewCommittee' 
                ORDER BY gap.id DESC 
                LIMIT 1
            )
            ), 
        RatifiedCommitteeGovAction AS (
            SELECT gap.id
            FROM gov_action_proposal gap
            WHERE gap.type = 'NewCommittee'
            AND ratified_epoch IS NOT NULL
            ORDER BY gap.id DESC
            LIMIT 1
        ),
        Committee AS (
            SELECT json_build_object(
                'prev_gov_action_id', (SELECT hash_index FROM PreviosActionId),
                'quorum_numerator', c.quorum_numerator,
                'quorum_denominator', c.quorum_denominator,
                'committee_hashes', jsonb_agg(
                    DISTINCT jsonb_build_object(
                        'hash', encode(ch.raw, 'hex'),
                        'has_script', ch.has_script,
                        'expiration_epoch', cm.expiration_epoch
                    )
                )
            ) AS committee_data
            FROM committee c
            JOIN committee_member cm ON cm.committee_id = c.id
            JOIN committee_hash ch ON cm.committee_hash_id = ch.id
            LEFT JOIN RatifiedCommitteeGovAction rc 
                ON rc.id = c.gov_action_proposal_id
            WHERE c.gov_action_proposal_id IS NULL
            GROUP BY c.quorum_numerator, c.quorum_denominator
        )
        SELECT * FROM committee
        `) as Record<string, any>[]
    const rawResult = result[0].committee_data

    return convertKeysToCamelCase(rawResult)
}

export async function fetchBlockInfo(limit?: number, blockNo?: number) {
    let result: any
    if (blockNo) result = await prisma.$queryRaw`select * from block b where b.block_no=${blockNo}`
    else
        result =
            await prisma.$queryRaw`select * from block b where b.block_no is not null order by b.block_no desc limit ${
                limit || 5
            } `

    const parseResult = (result: any) => {
        return {
            blockNo: Number(result.block_no),
            hash: result.hash.toString('hex'),
            epochNo: result.epoch_no,
            slotNo: result.slot_no.toString(),
            epochSlotNo: result.epoch_slot_no,
            size: result.size,
            time: result.time,
            txCount: Number(result.tx_count),
            verificationKey: result.vrf_key,
        }
    }

    if (result.length == 0) return null
    if (result.length == 1) return parseResult(result[0])
    else
        return result.map((res: any) => {
            return parseResult(res)
        })
}
