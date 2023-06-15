import { useAtomValue } from 'jotai';

import { chatAtom, getConversationAtom, getFollowingUpAtoms } from '../atoms';

export function useChatAtoms(): {
  conversationAtom: ReturnType<typeof getConversationAtom>;
  followingUpAtoms: ReturnType<typeof getFollowingUpAtoms>;
} {
  const chat = useAtomValue(chatAtom);
  const conversationAtom = getConversationAtom(chat.conversationChain);
  const followingUpAtoms = getFollowingUpAtoms(
    chat.followupChain,
    chat.chatHistory
  );
  return {
    conversationAtom,
    followingUpAtoms,
  };
}
