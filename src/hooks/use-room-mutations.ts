import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"

import {
  castVoteState,
  changeRoleState,
  claimDealerState,
  joinRoomState,
  leaveRoomState,
  passDealerState,
  revealRoomState,
  rerollRoomState,
  resetRoomState,
  setRoomResultState,
  type CardValue,
  type RoomState,
} from "#/lib/planning-poker"

import { usePlanningPokerIdentity } from "./use-planning-poker-identity"
import { useRoomAction } from "./use-room-action"
import { roomFeedbackQueryKey, roomQueryKey, type SendAction } from "./use-room-realtime"

type MutationContext = {
  previousRoom: RoomState | null
}

type RoomMutationOptions = {
  formatRoomError: (error: unknown) => string
}

type RoomMutationName =
  | "join"
  | "leave"
  | "changeRole"
  | "castVote"
  | "claimDealer"
  | "reveal"
  | "reset"
  | "reroll"
  | "setResult"
  | "passDealer"

export const roomMutationKey = (roomId: string, mutationName: RoomMutationName) =>
  ["room", roomId, "mutation", mutationName] as const

const useRoomId = () => {
  const { room } = useParams({ from: "/r/$room" })

  return room
}

const useMemberId = () => {
  const { identity } = usePlanningPokerIdentity()

  return identity?.memberId ?? null
}

const requireMemberId = (memberId: string | null) => {
  if (!memberId) {
    throw new Error("room_member_missing")
  }

  return memberId
}

const useRoomMutation = <TVars>(
  mutationName: RoomMutationName,
  options: RoomMutationOptions,
  createAction: (variables: TVars, memberId: string) => Parameters<SendAction>[0],
  optimisticUpdate?: (currentRoom: RoomState, variables: TVars, memberId: string) => RoomState,
) => {
  const queryClient = useQueryClient()
  const sendAction = useRoomAction()
  const roomId = useRoomId()
  const memberId = useMemberId()

  return useMutation<RoomState | null, unknown, TVars, MutationContext>({
    mutationKey: roomMutationKey(roomId, mutationName),
    onMutate: (variables) => {
      queryClient.setQueryData(roomFeedbackQueryKey(roomId), null)
      const previousRoom = queryClient.getQueryData<RoomState | null>(roomQueryKey(roomId)) ?? null

      if (!previousRoom || !optimisticUpdate) {
        return { previousRoom }
      }

      try {
        const nextMemberId = requireMemberId(memberId)
        queryClient.setQueryData(
          roomQueryKey(roomId),
          optimisticUpdate(previousRoom, variables, nextMemberId),
        )
      } catch {
        // Let the server remain the source of truth for invalid optimistic transitions.
      }

      return { previousRoom }
    },
    mutationFn: (variables) => sendAction(createAction(variables, requireMemberId(memberId))),
    onSuccess: (nextRoom) => {
      if (!nextRoom) {
        return
      }

      queryClient.setQueryData(roomFeedbackQueryKey(roomId), null)
      queryClient.setQueryData(roomQueryKey(roomId), nextRoom)
    },
    onError: (error, _variables, context) => {
      if (context?.previousRoom) {
        queryClient.setQueryData(roomQueryKey(roomId), context.previousRoom)
      }

      queryClient.setQueryData(roomFeedbackQueryKey(roomId), options.formatRoomError(error))
    },
  })
}

export const useJoinRoomMutation = (options: RoomMutationOptions) =>
  useRoomMutation(
    "join",
    options,
    (name: string, memberId) => ({
      type: "room.join",
      memberId,
      name,
    }),
    (currentRoom, name, memberId) =>
      joinRoomState({
        room: currentRoom,
        memberId,
        name,
        now: Date.now(),
      }),
  )

export const useLeaveRoomMutation = (options: RoomMutationOptions) =>
  useRoomMutation(
    "leave",
    options,
    (_unused, memberId) => ({
      type: "room.leave",
      memberId,
    }),
    (currentRoom, _unused, memberId) =>
      leaveRoomState({
        room: currentRoom,
        memberId,
        now: Date.now(),
      }),
  )

export const useChangeRoleMutation = (options: RoomMutationOptions) =>
  useRoomMutation(
    "changeRole",
    options,
    (role: "participant" | "spectator", memberId) => ({
      type: "room.changeRole",
      memberId,
      role,
    }),
    (currentRoom, role, memberId) =>
      changeRoleState({
        room: currentRoom,
        memberId,
        role,
        now: Date.now(),
      }),
  )

export const useCastVoteMutation = (options: RoomMutationOptions) =>
  useRoomMutation(
    "castVote",
    options,
    (vote: CardValue, memberId) => ({
      type: "room.castVote",
      memberId,
      vote,
    }),
    (currentRoom, vote, memberId) =>
      castVoteState({
        room: currentRoom,
        memberId,
        vote,
        now: Date.now(),
      }),
  )

export const useClaimDealerMutation = (options: RoomMutationOptions) =>
  useRoomMutation(
    "claimDealer",
    options,
    (_unused, memberId) => ({
      type: "room.claimDealer",
      memberId,
    }),
    (currentRoom, _unused, memberId) =>
      claimDealerState({
        room: currentRoom,
        memberId,
        now: Date.now(),
      }),
  )

export const useRevealVotesMutation = (options: RoomMutationOptions) =>
  useRoomMutation(
    "reveal",
    options,
    (_unused, memberId) => ({
      type: "room.reveal",
      memberId,
    }),
    (currentRoom, _unused, memberId) =>
      revealRoomState({
        room: currentRoom,
        memberId,
        now: Date.now(),
      }),
  )

export const useResetRoundMutation = (options: RoomMutationOptions) =>
  useRoomMutation(
    "reset",
    options,
    (_unused, memberId) => ({
      type: "room.reset",
      memberId,
    }),
    (currentRoom, _unused, memberId) =>
      resetRoomState({
        room: currentRoom,
        memberId,
        now: Date.now(),
      }),
  )

export const useRerollRoundMutation = (options: RoomMutationOptions) =>
  useRoomMutation(
    "reroll",
    options,
    (_unused, memberId) => ({
      type: "room.reroll",
      memberId,
    }),
    (currentRoom, _unused, memberId) =>
      rerollRoomState({
        room: currentRoom,
        memberId,
        now: Date.now(),
      }),
  )

export const useSetRoomResultMutation = (options: RoomMutationOptions) =>
  useRoomMutation(
    "setResult",
    options,
    (result: CardValue, memberId) => ({
      type: "room.setResult",
      memberId,
      result,
    }),
    (currentRoom, result, memberId) =>
      setRoomResultState({
        room: currentRoom,
        memberId,
        result,
        now: Date.now(),
      }),
  )

export const usePassDealerMutation = (options: RoomMutationOptions) =>
  useRoomMutation(
    "passDealer",
    options,
    (_unused, memberId) => ({
      type: "room.passDealer",
      memberId,
    }),
    (currentRoom, _unused, memberId) =>
      passDealerState({
        room: currentRoom,
        memberId,
        now: Date.now(),
      }),
  )
