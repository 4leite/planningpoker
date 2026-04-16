import { humanId } from "human-id"

export const generateRoomId = () => humanId({ separator: "-", capitalize: false })
