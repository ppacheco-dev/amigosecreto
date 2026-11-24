export interface WishItem {
  id: string;
  text: string;
}

export interface Participant {
  id: string;
  name: string;
  secretToken: string;
  wishlist: WishItem[];
  sizesOrNotes: string;
  hasRevealed: boolean;
  revealedAt: string | null;
  wishlistUpdatedAt: string | null;
  createdAt: string;
}

export interface Restriction {
  id: string;
  fromId: string;
  toId: string;
  mutual: boolean;
}

export interface GameConfig {
  title: string;
  budget: string;
  eventDate: string;
  notes: string;
  adminPinHash: string | null;
  status: "setup" | "drawn";
  drawnAt: string | null;
}

export interface GameState {
  config: GameConfig;
  participants: Participant[];
  restrictions: Restriction[];
  /** giverId -> receiverId. NEVER exposed to admin endpoints! */
  assignments: Record<string, string>;
}

export interface AdminParticipantSummary {
  id: string;
  name: string;
  secretToken: string;
  hasWishlist: boolean;
  wishlistCount: number;
  hasRevealed: boolean;
  revealedAt: string | null;
  wishlistUpdatedAt: string | null;
}
