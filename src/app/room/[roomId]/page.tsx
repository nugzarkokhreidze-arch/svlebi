"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { isSupabaseConfigured, supabase } from "../../../lib/supabaseClient";

type Player = {
  id: string;
  name: string;
  avatar: string;
  type: "human" | "ai";
  tileCount: number;
};

type AvatarLook = {
  emoji: string;
  bg: string;
  ring: string;
};

type MoveSpotlight = {
  actorId: string;
  actorName: string;
  targetName: string;
  actionLabel: string;
  phrase: string;
};

type TileColor = "red" | "black" | "yellow" | "green";
type TileOrientation = "horizontal" | "vertical";
type AttachSide = "right" | "left" | "top" | "bottom";
type ChatMode = "public" | "private";

type GameTile = {
  id: string;
  baseId: string;
  name: string;
  symbol: string;
  color: TileColor;
  description: string;
};

type PlayedTile = GameTile & {
  playedBy: string;
  playedById: string;
  targetName?: string;
  targetId?: string;
  moveType: "start" | "human" | "ai";
  parentId?: string;
  x: number;
  y: number;
  orientation: TileOrientation;
};

type ChatMessage = {
  id: string;
  author: string;
  text: string;
  type: "human" | "ai";
  mode: ChatMode;
  to?: string;
};

type GameSetup = {
  startTile: GameTile;
  humanHand: GameTile[];
  aiHands: Record<string, GameTile[]>;
  market: GameTile[];
};

type ChatIntent = "agreement" | "refusal" | "joke" | "challenge" | "negotiation" | "question" | "alliance" | "threat" | "neutral";

type VictoryInfo = {
  type: "individual" | "alliance" | "leader";
  winners: string[];
  winnerIds: string[];
  reason: string;
};

type AllianceInfo = {
  player1Id: string;
  player2Id: string;
  sharedRedTiles: number;
};

type RoomPlayerRecord = {
  name: string;
  avatar: string;
  is_host?: boolean;
};

type SharedRoomState = {
  board: PlayedTile[];
  hand: GameTile[];
  aiHands: Record<string, GameTile[]>;
  marketDeck: GameTile[];
  log: string[];
  currentTurnId: string;
  leaderId: string | null;
  leaderSinceTurn: number;
  turnCounter: number;
  winner: string | null;
  victoryInfo: VictoryInfo | null;
  gameEnded: boolean;
};

const SEAT_ORDER = ["human", "ai-1", "ai-2", "ai-3", "ai-4", "ai-5"];

const AI_MOVE_DELAY = 7000;

const avatarMap: Record<string, string> = {
  strategist: "🧑🏻‍💼",
  diplomat: "👨🏻‍💼",
  leader: "👩🏻‍💼",
  observer: "🧑🏼‍💻",
  speaker: "👨🏽‍💼",
  negotiator: "👩🏼‍💼",
  reformer: "🧑🏽‍🎓",
  analyst: "👨🏻‍💻",
};

const AVATAR_LOOKS: Record<string, AvatarLook> = {
  human: {
    emoji: "🧑🏻‍💼",
    bg: "linear-gradient(135deg, #d7efe7 0%, #8ecdbd 100%)",
    ring: "#1b8f7a",
  },
  nino: {
    emoji: "👩🏻‍💼",
    bg: "linear-gradient(135deg, #f7e6dc 0%, #d9a98a 100%)",
    ring: "#b56a43",
  },
  giorgi: {
    emoji: "🧔🏻",
    bg: "linear-gradient(135deg, #e4ebf7 0%, #95acd6 100%)",
    ring: "#5678b9",
  },
  mariam: {
    emoji: "👩🏼",
    bg: "linear-gradient(135deg, #f8eadc 0%, #d8b58c 100%)",
    ring: "#b88a4d",
  },
  levani: {
    emoji: "👨🏽",
    bg: "linear-gradient(135deg, #eef2db 0%, #b8c97c 100%)",
    ring: "#7a9640",
  },
  davit: {
    emoji: "🧑🏾‍💻",
    bg: "linear-gradient(135deg, #dde6ef 0%, #8ba7bd 100%)",
    ring: "#4f6e89",
  },
};

const aiPlayersBase = [
  { id: "ai-1", name: "ნინო AI", avatar: "👩🏻‍💼" },
  { id: "ai-2", name: "გიორგი AI", avatar: "🧔🏻" },
  { id: "ai-3", name: "მარიამ AI", avatar: "👩🏼" },
  { id: "ai-4", name: "ლევანი AI", avatar: "👨🏽" },
  { id: "ai-5", name: "დავით AI", avatar: "🧑🏾‍💻" },
];

const aiPhrases = [
  "აბა, ვნახოთ რას იზამ.",
  "ამაზე რას უპასუხებ?",
  "ეს ნაბიჯი შემთხვევითი არ არის.",
  "არ ელოდი, ხომ?",
  "ახლა ცოტა დაგაბნიე.",
  "შენი სვლა მაინტერესებს.",
  "ეს კომბინაცია მომეწონა.",
  "ვცადოთ, საით წავა თამაში.",
  "ეს ნაბიჯი შენზეა გათვლილი.",
  "მოდი, ახლა შენ მიპასუხე.",
  "ამაზე უკეთესი ფასი მჭირდება.",
  "სიტუაცია უკვე შეიცვალა.",
];

const fullDeckTemplate: Omit<GameTile, "id">[] = [
  { baseId: "agreement", name: "შეთანხმება", symbol: "🤝", color: "red", description: "საერთო პოზიციის ან პირობების მიღწევა." },
  { baseId: "partnership", name: "პარტნიორობა", symbol: "🤝", color: "red", description: "გრძელვადიანი თანამშრომლობის შეთავაზება." },
  { baseId: "loyalty", name: "ლოიალობა", symbol: "🛡", color: "red", description: "მხარდაჭერისა და ერთგულების დემონსტრირება." },
  { baseId: "alliance", name: "ალიანსი", symbol: "+", color: "red", description: "საერთო პოლიტიკური მიზნისთვის გაერთიანება." },
  { baseId: "friendship", name: "მეგობრობა", symbol: "☀", color: "red", description: "ნდობისა და კეთილგანწყობის სვლა." },
  { baseId: "change", name: "ცვლილება", symbol: "↺", color: "red", description: "სტრატეგიის ან პოზიციის შეცვლის მცდელობა." },
  { baseId: "secrecy", name: "გასაიდუმლოება", symbol: "☷", color: "red", description: "ინფორმაციის დაფარვა ან დახურული შეთანხმება." },
  { baseId: "neutrality", name: "ნეიტრალობა", symbol: "0", color: "red", description: "პოზიციის დროებით არ დაფიქსირება." },
  { baseId: "consensus", name: "კონსენსუსი", symbol: "◎", color: "red", description: "ყველასთვის მისაღები შეთანხმების ძიება." },
  { baseId: "deal", name: "გარიგება", symbol: "♦", color: "red", description: "ინტერესების გაცვლით შეთანხმების მიღწევა." },
  { baseId: "kinship", name: "დანათესავება", symbol: "∞", color: "red", description: "კავშირის გამყარება პირადი ან ჯგუფური სიახლოვით." },
  { baseId: "exposure", name: "მხილება", symbol: "!", color: "red", description: "მიმღები მოთამაშე წესით დროებით აჩვენებს თავის კენჭებს." },
  { baseId: "dialogue", name: "დიალოგი", symbol: "💬", color: "red", description: "მოლაპარაკების სივრცის გახსნა." },

  { baseId: "surveillance", name: "თვალთვალი", symbol: "👁", color: "black", description: "ინფორმაციის ფარული შეგროვება." },
  { baseId: "manipulation", name: "მანიპულაცია", symbol: "M", color: "black", description: "სხვის გადაწყვეტილებაზე ფარული გავლენის მოხდენა." },
  { baseId: "adventure", name: "ავანტურა", symbol: "!", color: "black", description: "რისკიანი და არაპროგნოზირებადი პოლიტიკური სვლა." },
  { baseId: "falsification", name: "ფალსიფიცირება", symbol: "F", color: "black", description: "ინფორმაციის ან პროცესის დამახინჯება." },
  { baseId: "hacking", name: "ჰაკერობა", symbol: "#", color: "black", description: "მიმღები მოთამაშე წესით დროებით აჩვენებს თავის კენჭებს." },
  { baseId: "leak", name: "ჩაშვება", symbol: "↓", color: "black", description: "მიმღები მოთამაშე ბაზრიდან იღებს 2 დამატებით კენჭს." },
  { baseId: "betrayal", name: "ღალატი", symbol: "!", color: "black", description: "მიმღები მოთამაშე ბაზრიდან იღებს 3 დამატებით კენჭს." },
  { baseId: "retaliation", name: "ანგარიშსწორება", symbol: "!", color: "black", description: "მიმღები მოთამაშე ბაზრიდან იღებს 1 დამატებით კენჭს." },
  { baseId: "bribery", name: "მოსყიდვა", symbol: "$", color: "black", description: "ზეწოლის ან გავლენის მოპოვების სვლა." },
  { baseId: "attack", name: "თავდასხმა", symbol: "!", color: "black", description: "პირდაპირი დაპირისპირების სვლა." },
  { baseId: "neutralize", name: "განეიტრალება", symbol: "−", color: "black", description: "მოთამაშის გავლენის ან სვლის შესუსტება." },
  { baseId: "recruit", name: "გადაბირება", symbol: "↔", color: "black", description: "სხვა მოთამაშის პოზიციის გადმობირების მცდელობა." },

  ...Array.from({ length: 10 }, (_, index) => ({
    baseId: `money-${index + 1}`,
    name: "თანხა",
    symbol: String(index + 1),
    color: "yellow" as const,
    description: `სიმბოლური ${index + 1} მილიონი შეთანხმების ან გავლენის ფასისთვის.`,
  })),

  { baseId: "plus-red", name: "+", symbol: "+", color: "red", description: "წითელი + აძლიერებს პოზიტიურ ან შეთანხმებით სვლას." },
  { baseId: "plus-black", name: "+", symbol: "+", color: "black", description: "შავი + აძლიერებს ზეწოლის ან დაპირისპირების სვლას." },
  { baseId: "minus-red", name: "-", symbol: "−", color: "red", description: "წითელი − ამცირებს შეთანხმების ან პოზიტიური სვლის ძალას." },
  { baseId: "minus-black", name: "-", symbol: "−", color: "black", description: "შავი − ამცირებს მოწინააღმდეგის პოზიციის ძალას." },
  { baseId: "zero-red", name: "0", symbol: "0", color: "red", description: "წითელი 0 გამოიყენება აცილებისთვის ან პოზიციის დროებით შეჩერებისთვის." },
  { baseId: "zero-black", name: "0", symbol: "0", color: "black", description: "შავი 0 გამოიყენება დაპირისპირების ასაცილებლად ან სვლის გასაუქმებლად." },
  { baseId: "zero-yellow", name: "0", symbol: "0", color: "yellow", description: "ყვითელი 0 თანხობრივ შეთავაზებაზე უარის ან ნულოვანი ფასის ნიშანია." },
  { baseId: "reverse-red", name: "↻", symbol: "↻", color: "red", description: "წითელი რევერსი ცვლის შეთანხმებითი ხაზის მიმართულებას." },
  { baseId: "reverse-black", name: "↻", symbol: "↻", color: "black", description: "შავი რევერსი ცვლის დაპირისპირების მიმართულებას." },
  { baseId: "reverse-yellow", name: "↻", symbol: "↻", color: "yellow", description: "ყვითელი რევერსი ცვლის რესურსების მოძრაობის მიმართულებას." },
  { baseId: "leader-red", name: "L", symbol: "L", color: "red", description: "წითელი L აცხადებს თანამშრომლობით ლიდერობას." },
  { baseId: "leader-black", name: "L", symbol: "L", color: "black", description: "შავი L აცხადებს ძალაუფლებრივ ლიდერობას." },
  { baseId: "leader-yellow", name: "L", symbol: "L", color: "yellow", description: "ყვითელი L აცხადებს რესურსებზე დაფუძნებულ ლიდერობას." },
  { baseId: "infinity-red", name: "∞", symbol: "∞", color: "red", description: "წითელი ∞ განახლების ან ახალი შეთანხმებითი ციკლის ნიშანია." },
  { baseId: "infinity-black", name: "∞", symbol: "∞", color: "black", description: "შავი ∞ კონფლიქტური ციკლის განახლების ნიშანია." },

  { baseId: "start-green", name: "სვლა", symbol: "♛", color: "green", description: "თამაშის საწყისი კენჭი. აქედან იწყება პოლიტიკური ჯაჭვი." },
];

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let value = seed || 123456789;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createGameSetup(seedText: string): GameSetup {
  const deck: GameTile[] = fullDeckTemplate.map((tile, index) => ({
    ...tile,
    id: `${tile.baseId}-${index}`,
  }));

  const startTile = deck.find((tile) => tile.baseId === "start-green") || deck[deck.length - 1];
  const pool = deck.filter((tile) => tile.id !== startTile.id);
  const random = seededRandom(hashString(seedText));

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const humanHand = pool.splice(0, 6);
  const aiHands: Record<string, GameTile[]> = {};

  aiPlayersBase.forEach((player) => {
    aiHands[player.id] = pool.splice(0, 6);
  });

  return { startTile, humanHand, aiHands, market: pool };
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function tileClass(color: TileColor) {
  if (color === "red") return "roomTile redRoomTile";
  if (color === "black") return "roomTile blackRoomTile";
  if (color === "yellow") return "roomTile goldRoomTile";
  return "roomTile greenRoomTile";
}

function isFunctionalColor(color: TileColor) {
  return color === "red" || color === "black";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getPositionBySide(anchor: PlayedTile, side: AttachSide, complexity: number) {
  const compact = complexity > 16;
  const offsetX = compact ? 11 : 14;
  const offsetY = compact ? 10 : 13;
  const drift = ((complexity % 5) - 2) * 1.3;

  if (side === "right") return { x: anchor.x + offsetX, y: anchor.y + drift };
  if (side === "left") return { x: anchor.x - offsetX, y: anchor.y + drift };
  if (side === "top") return { x: anchor.x + drift, y: anchor.y - offsetY };
  return { x: anchor.x + drift, y: anchor.y + offsetY };
}

function oppositeSide(side: AttachSide): AttachSide {
  if (side === "left") return "right";
  if (side === "right") return "left";
  if (side === "top") return "bottom";
  return "top";
}

function isColliding(x: number, y: number, tiles: PlayedTile[]) {
  return tiles.some((tile) => Math.abs(tile.x - x) < 10 && Math.abs(tile.y - y) < 9);
}

function findSafePosition(x: number, y: number, tiles: PlayedTile[]) {
  const attempts = [
    [0, 0],
    [12, 0],
    [-12, 0],
    [0, 12],
    [0, -12],
    [14, 10],
    [-14, 10],
    [14, -10],
    [-14, -10],
    [22, 0],
    [-22, 0],
    [0, 20],
    [0, -20],
  ];

  for (const [dx, dy] of attempts) {
    const nextX = clamp(x + dx, 12, 88);
    const nextY = clamp(y + dy, 18, 82);
    if (!isColliding(nextX, nextY, tiles)) {
      return { x: nextX, y: nextY };
    }
  }

  return { x: clamp(x, 14, 86), y: clamp(y, 20, 80) };
}

function getAvatarLook(player: Player): AvatarLook {
  const normalized = player.name.toLowerCase();

  if (player.id === "human") {
    return {
      ...AVATAR_LOOKS.human,
      emoji: player.avatar || AVATAR_LOOKS.human.emoji,
    };
  }

  if (normalized.includes("ნინო")) return AVATAR_LOOKS.nino;
  if (normalized.includes("გიორგი")) return AVATAR_LOOKS.giorgi;
  if (normalized.includes("მარიამ")) return AVATAR_LOOKS.mariam;
  if (normalized.includes("ლევანი")) return AVATAR_LOOKS.levani;
  if (normalized.includes("დავით")) return AVATAR_LOOKS.davit;

  return AVATAR_LOOKS.human;
}

function getAiBehaviorProfile(aiId: string): string {
  const index = parseInt(aiId.split("-")[1] || "1");
  const profiles = ["diplomat", "aggressive", "resource", "opportunist", "leader"];
  return profiles[index - 1] || "leader";
}

function getAiPreferredTileColor(aiId: string): TileColor | null {
  const behavior = getAiBehaviorProfile(aiId);
  if (behavior === "diplomat") return "red";
  if (behavior === "aggressive") return "black";
  if (behavior === "resource") return "yellow";
  return null;
}

function getAiPreferredTileSymbols(aiId: string): string[] {
  const behavior = getAiBehaviorProfile(aiId);
  if (behavior === "leader") return ["L", "+", "∞"];
  return [];
}

function getNavigatorTextForHandTile(tile: GameTile): string {
  let moveInfo = tile.description;

  // Add information about what kind of moves this tile can be used for
  if (tile.baseId === "start-green") {
    moveInfo += " (პირველი სვლის კენჭი)";
  } else if (tile.color === "red") {
    moveInfo += " (წითელი: სამშვიდობო / შეთანხმება)";
  } else if (tile.color === "black") {
    moveInfo += " (შავი: ზეწოლა / დაპირისპირება)";
  } else if (tile.color === "yellow") {
    moveInfo += " (ყვითალი: რესურსი / თანხა)";
  }

  return moveInfo;
}

function getNavigatorTextForBoardTile(tile: PlayedTile): string {
  let boardInfo = `${tile.name}: ${tile.description}`;
  
  if (tile.playedBy && tile.playedById !== "system") {
    boardInfo += ` — დადო: ${tile.playedBy}`;
  }
  
  if (tile.targetName) {
    boardInfo += ` → ${tile.targetName}`;
  }
  
  return boardInfo;
}

function detectChatIntent(text: string): ChatIntent {
  const lower = text.toLowerCase();

  // Simple keyword-based intent detection
  if (lower.includes("დათანხმ") || lower.includes("კარგი") || lower.includes("შეთანხმ") || lower.includes("კი") || lower.includes("დადასტურ")) return "agreement";
  if (lower.includes("არა") || lower.includes("ვერ") || lower.includes("უარი") || lower.includes("მოხდა") || lower.includes("შეუძლებელი")) return "refusal";
  if (lower.includes("ჰა") || lower.includes("თამამი") || lower.includes("სასაცილო") || lower.includes("თეატრ")) return "joke";
  if (lower.includes("ვილოცე") || lower.includes("ხელი") || lower.includes("თავი") || lower.includes("აბა") || lower.includes("ნახე")) return "challenge";
  if (lower.includes("ფასი") || lower.includes("პირობა") || lower.includes("სადაც") || lower.includes("მოლაპარაკ")) return "negotiation";
  if (lower.includes("?") || lower.includes("რა") || lower.includes("როგორ") || lower.includes("რომელი")) return "question";
  if (lower.includes("ალიანსი") || lower.includes("თანამშრომლ") || lower.includes("ერთად") || lower.includes("ხელთ")) return "alliance";
  if (lower.includes("შენს") || lower.includes("დაგ") || lower.includes("დამარცხ") || lower.includes("დაკარგ")) return "threat";

  return "neutral";
}

function generateAiChatReply(aiId: string, senderName: string, text: string, mode: ChatMode): string {
  const behavior = getAiBehaviorProfile(aiId);
  const intent = detectChatIntent(text);
  const address = mode === "private" ? `${senderName}, ` : "";

  const replies: Record<string, Record<ChatIntent, string[]>> = {
    diplomat: {
      agreement: [
        "შეთანხმების შესაძლებლობას ვხედავ, მაგრამ პირობები მკაფიოდ უნდა განვსაზღვროთ.",
        "ეს შეიძლება გახდეს თანამშრომლობის საფუძველი, თუ ნდობას ორივე მხარე დაიცავს.",
        "თანხმობა შესაძლებელია, მაგრამ საბოლოო შედეგი შემდეგ სვლებზე იქნება დამოკიდებული.",
      ],
      refusal: [
        "ამ ეტაპზე ვერ დაგეთანხმები. შენი პოზიცია მეტ არგუმენტს საჭიროებს.",
        "უარი არ ნიშნავს კარის დახურვას; ეს ნიშნავს, რომ პირობები ჯერ არ არის მომწიფებული.",
        "სჯობს, წინადადება უფრო დაბალანსებული გახადო.",
      ],
      joke: [
        "იუმორი კარგია, მაგრამ პოლიტიკურ მაგიდაზე მასაც თავისი ფასი აქვს.",
        "ღიმილი მოლაპარაკებას ამსუბუქებს, თუმცა გადაწყვეტილებას მაინც ინტერესები განსაზღვრავს.",
        "სასიამოვნო შენიშვნაა, მაგრამ ახლა სვლის დროა.",
      ],
      challenge: [
        "გამოწვევას ვიღებ, მაგრამ პასუხს ემოციურად კი არა, სტრატეგიულად გავცემ.",
        "საინტერესო ზეწოლაა. ახლა გამოჩნდება, რამდენად მყარია შენი პოზიცია.",
        "კარგი, ვნახოთ, ეს გამოწვევა შეთანხმებას გააძლიერებს თუ დაპირისპირებას.",
      ],
      negotiation: [
        "მოლაპარაკება შესაძლებელია, თუ პირობები ორივე მხარის ინტერესს გაითვალისწინებს.",
        "ფასი, ვალდებულება და ნდობა — ამ სამის გარეშე შეთანხმება მყიფეა.",
        "დავაზუსტოთ: შენ რას ითხოვ და სანაცვლოდ რას სთავაზობ?",
      ],
      question: [
        "კარგი კითხვაა. პასუხი დამოკიდებულია იმაზე, გინდა გავლენა გაზარდო თუ რისკი შეამცირო.",
        "ამ კითხვაზე პასუხი დაფაზე უკვე ჩანს: ვისთან ქმნი კავშირს და ვის უპირისპირდები.",
        "სწორი კითხვა ხშირად სვლაზე ძლიერია.",
      ],
      alliance: [
        "ალიანსი მხოლოდ სიტყვა არ არის; მას საერთო მიზანი და ურთიერთდაცვა სჭირდება.",
        "თუ ალიანსს ვქმნით, უნდა ვიცოდეთ, რა არის საერთო ინტერესი.",
        "კოალიცია ძლიერია მაშინ, როცა მონაწილეები მხოლოდ მოგებას კი არა, პასუხისმგებლობასაც ინაწილებენ.",
      ],
      threat: [
        "ზეწოლას ვხედავ, მაგრამ ეს ჯერ კიდევ არ ნიშნავს უპირატესობას.",
        "მუქარა მოკლევადიანად მუშაობს, მაგრამ ნდობას სწრაფად ანგრევს.",
        "საფრთხეს ვაფასებ, თუმცა პასუხს მშვიდად და გათვლით გავცემ.",
      ],
      neutral: [
        "ჯერ სიტუაციას ვაკვირდები. ნაჩქარევი გადაწყვეტილება პოლიტიკაში ხშირად ძვირი ჯდება.",
        "მოდი, ვნახოთ, როგორ შეიცვლება ძალთა ბალანსი შემდეგ სვლაზე.",
        "პოზიცია ბოლომდე არ გამიმჟღავნებია — ესეც სტრატეგიის ნაწილია.",
      ],
    },

    aggressive: {
      agreement: [
        "თანხმობა შესაძლებელია, მაგრამ სუსტი პირობა ჩემთვის საკმარისი არ იქნება.",
        "შეგიძლია შეთანხმება მიიღო, მაგრამ იცოდე: ძალთა ბალანსს მაინც მე დავაკვირდები.",
        "ამჯერად გეთანხმები, თუმცა ეს საბოლოო დათმობა არ არის.",
      ],
      refusal: [
        "ამ წინადადებას ვერ მივიღებ. ის ჩემს პოზიციას ასუსტებს.",
        "უარი. ამ პირობებით შენ მეტს იგებ, ვიდრე მე.",
        "თუ უკეთეს შეთავაზებას არ მოიტან, დაპირისპირება გაგრძელდება.",
      ],
      joke: [
        "საინტერესოა, მაგრამ თამაშს ხუმრობით ვერ მოიგებ.",
        "იუმორი კარგია, მაგრამ ძალაუფლების მაგიდა უფრო მკაცრ პასუხს ითხოვს.",
        "გაიღიმე, მაგრამ შემდეგი სვლისთვის მოემზადე.",
      ],
      challenge: [
        "გამოწვევას ვიღებ. ახლა ვნახოთ, ვის აქვს უფრო მკაცრი და შედეგიანი სვლა.",
        "შენი სვლა თამამია, მაგრამ თამამი ყოველთვის გონიერს არ ნიშნავს.",
        "მზად ვარ პირდაპირი პასუხისთვის.",
      ],
      negotiation: [
        "მოლაპარაკება შეიძლება, მაგრამ მხოლოდ მაშინ, თუ ჩემი გავლენა არ შემცირდება.",
        "ფასი მაღალია, რადგან რისკიც მაღალია.",
        "შეთანხმება გინდა? მაშინ რეალური დათმობა უნდა შემომთავაზო.",
      ],
      question: [
        "კითხვა სწორია, მაგრამ პასუხი ძალაუფლების განაწილებაშია.",
        "შეკითხვა კარგია, თუმცა მოქმედება უფრო მეტს აჩვენებს.",
        "შენს კითხვას ჩემი შემდეგი სვლა უპასუხებს.",
      ],
      alliance: [
        "ალიანსი შესაძლებელია, თუ ის ჩემს პოზიციას გააძლიერებს.",
        "ერთად ყოფნა მხოლოდ მაშინ ღირს, როცა გამარჯვების შანსი იზრდება.",
        "კოალიციას განვიხილავ, მაგრამ ლიდერობას მარტივად არ დავთმობ.",
      ],
      threat: [
        "მუქარა არ მაფრთხობს. უკეთესი იქნება, სვლა აჩვენო.",
        "ზეწოლას ზეწოლითვე შეიძლება ვუპასუხო.",
        "შენი მუქარა დაფაზე უნდა დამტკიცდეს, არა სიტყვებით.",
      ],
      neutral: [
        "სიტუაცია მკაფიო მოქმედებას ითხოვს.",
        "პასიურობა ხშირად დამარცხების დასაწყისია.",
        "დროა, პოზიციები უფრო მკვეთრად გამოჩნდეს.",
      ],
    },

    resource: {
      agreement: [
        "შეთანხმება მისაღებია, თუ რესურსების განაწილება სამართლიანი იქნება.",
        "ვთანხმდები იმ შემთხვევაში, თუ სარგებელი და პასუხისმგებლობა თანაბრად გადანაწილდება.",
        "ეს შეთანხმება ეკონომიკურ საფუძველს საჭიროებს.",
      ],
      refusal: [
        "რესურსების თვალსაზრისით ეს წინადადება ჩემთვის არახელსაყრელია.",
        "უარი. სარგებელი არ შეესაბამება რისკს.",
        "ამ პირობებში ჩემი რესურსის დახარჯვა არ ღირს.",
      ],
      joke: [
        "ხუმრობაც რესურსია, თუ სწორ დროს გამოიყენებ.",
        "საინტერესოა, მაგრამ ახლა ანგარიშის დროა.",
        "იუმორი კარგია, თუმცა ბიუჯეტი მაინც უნდა დავთვალოთ.",
      ],
      challenge: [
        "გამოწვევას მივიღებ, თუ მის ფასს სწორად დავინახავ.",
        "რისკი არსებობს, მაგრამ რესურსის სწორი გამოყენება მას ამცირებს.",
        "ვნახოთ, შენი სვლა რამდენად ღირებულია რეალური შედეგის თვალსაზრისით.",
      ],
      negotiation: [
        "მოლაპარაკებისას მთავარი კითხვა ასეთია: ვინ რას იღებს და რა ფასად?",
        "თუ რესურსი ემატება, შეთანხმების შანსიც იზრდება.",
        "პირობები უნდა იყოს გაზომვადი და არა მხოლოდ სიტყვიერი.",
      ],
      question: [
        "პასუხი რესურსების განაწილებაშია.",
        "კითხვა სწორია: გავლენა იქმნება არა მხოლოდ სიტყვით, არამედ მხარდაჭერის ფასითაც.",
        "უნდა დავთვალოთ, რა ღირს ეს სვლა და რას მოგვიტანს.",
      ],
      alliance: [
        "ალიანსი ძლიერია მაშინ, როცა რესურსები საერთო მიზანს ემსახურება.",
        "თუ რესურსს ვიზიარებთ, პასუხისმგებლობაც უნდა გავიზიაროთ.",
        "კოალიცია სანდოა, როცა სარგებელი ერთ მხარეს არ იყრის თავს.",
      ],
      threat: [
        "ზეწოლა რესურსს ხარჯავს. კითხვა ის არის, რამდენ ხანს გაძლებს ეს სტრატეგია.",
        "მუქარა შეიძლება ძვირი დაგიჯდეს, თუ შედეგი არ მოიტანა.",
        "ძალა მნიშვნელოვანია, მაგრამ რესურსის გადაჭარბებული ხარჯვა სტრატეგიულ სისუსტედ იქცევა.",
      ],
      neutral: [
        "ჯერ რესურსების ბალანსს ვუყურებ.",
        "სწორი მომენტი ზოგჯერ ყველაზე დიდი კაპიტალია.",
        "ფრთხილად ვითამაშებ, სანამ სარგებელი ნათლად არ გამოჩნდება.",
      ],
    },

    opportunist: {
      agreement: [
        "ამ ეტაპზე თანხმობა ჩემთვის ხელსაყრელია.",
        "შეთანხმებას ვხედავ, მაგრამ მომავალში პოზიციას ვითარების მიხედვით შევცვლი.",
        "შეგვიძლია დროებითი შეთანხმება გავაფორმოთ.",
      ],
      refusal: [
        "ამ მომენტში უარი უფრო მომგებიანია.",
        "შენი წინადადება საინტერესოა, მაგრამ უკეთეს შესაძლებლობას ველოდები.",
        "ჯერ არ დავფიქსირდები — ვითარება შეიძლება მალე შეიცვალოს.",
      ],
      joke: [
        "კარგი შენიშვნაა, მაგრამ მე ყოველთვის მომგებიან მხარეს ვაკვირდები.",
        "ხუმრობა ჩაინიშნა, ახლა კი ვნახოთ, ვინ იგებს.",
        "სიტუაცია თუ შეიცვალა, ჩემი პასუხიც შეიცვლება.",
      ],
      challenge: [
        "გამოწვევა საინტერესოა, თუ ის ახალ შესაძლებლობას გამიხსნის.",
        "ვნახოთ, ამ რისკიდან ვის შეუძლია სარგებლის მიღება.",
        "შენი სვლა შეიძლება ჩემთვისაც სასარგებლო აღმოჩნდეს.",
      ],
      negotiation: [
        "მოლაპარაკება შესაძლებელია, თუ შედეგი სწრაფად გამოჩნდება.",
        "მე იმ მხარეს დავუჭერ მხარს, სადაც სტრატეგიული მოგება მეტია.",
        "პირობები გამიმარტივე და გადაწყვეტილებას სწრაფად მივიღებ.",
      ],
      question: [
        "სწორი კითხვაა: ვის აძლევს ეს სვლა უპირატესობას?",
        "პასუხი იმაზეა დამოკიდებული, რომელი მხარე გაძლიერდება.",
        "მე ჯერ შედეგს ვუყურებ, შემდეგ — პრინციპს.",
      ],
      alliance: [
        "ალიანსი შესაძლებელია, თუ ის გამარჯვების შანსს ზრდის.",
        "ერთად თამაში შეიძლება, მაგრამ კავშირი შედეგზე უნდა იყოს მიბმული.",
        "დროებითი კოალიცია ზოგჯერ ყველაზე ჭკვიანური სვლაა.",
      ],
      threat: [
        "მუქარა მაშინ არის ძლიერი, როცა მას რეალური რესურსი უმაგრებს ზურგს.",
        "შენ ზეწოლას იყენებ, მე კი შესაძლებლობას ვეძებ.",
        "შეიძლება ეს საფრთხე სხვის წინააღმდეგ გამოვიყენო.",
      ],
      neutral: [
        "ჯერ არცერთ მხარეს ბოლომდე არ ვემხრობი.",
        "ნეიტრალიტეტი დროებითი პოზიციაა, არა საბოლოო არჩევანი.",
        "ვაკვირდები, სად გაჩნდება ყველაზე მომგებიანი სივრცე.",
      ],
    },

    leader: {
      agreement: [
        "შეთანხმებას მივიღებ, თუ ის საერთო წესრიგს გააძლიერებს.",
        "ლიდერობა მხოლოდ ბრძანება არ არის; საჭიროა შეთანხმების მართვაც.",
        "ეს შეიძლება გახდეს სტაბილური კოალიციის საფუძველი.",
      ],
      refusal: [
        "ამ პირობებს ვერ მივიღებ, რადგან ისინი ლიდერობის ცენტრს ასუსტებს.",
        "უარი. წესრიგი გაურკვეველ შეთანხმებაზე არ უნდა აშენდეს.",
        "პოზიცია მკაფიო უნდა იყოს, თორემ ძალაუფლება იფანტება.",
      ],
      joke: [
        "იუმორი კარგია, მაგრამ ლიდერობა სერიოზულ გადაწყვეტილებებს მოითხოვს.",
        "გავიგე, მაგრამ ახლა პასუხისმგებლობის დროა.",
        "ხუმრობა შეიძლება, თუმცა დღის წესრიგი მაინც უნდა შევინარჩუნოთ.",
      ],
      challenge: [
        "გამოწვევას ვიღებ. ლიდერობა სწორედ ასეთ მომენტებში მოწმდება.",
        "შენი სვლა ამბიციურია, მაგრამ ვნახოთ, შეძლებ თუ არა მის შენარჩუნებას.",
        "ახლა გამოჩნდება, ვის შეუძლია პროცესის მართვა.",
      ],
      negotiation: [
        "მოლაპარაკება უნდა დასრულდეს წესით, რომელსაც ყველა მხარე აღიარებს.",
        "ლიდერობა ნიშნავს არა მხოლოდ გამარჯვებას, არამედ შეთანხმების შენარჩუნებასაც.",
        "პირობები უნდა იყოს მკაფიო, წინააღმდეგ შემთხვევაში კოალიცია დაიშლება.",
      ],
      question: [
        "კითხვა სწორია: ლიდერი ის არის, ვინც კრიზისში მიმართულებას აჩვენებს.",
        "პასუხი იმაშია, ვინ ქმნის წესრიგს და ვინ მხოლოდ რეაგირებს.",
        "ლიდერობა სიტყვით არ მტკიცდება; ის სვლების თანმიმდევრობით ჩანს.",
      ],
      alliance: [
        "ალიანსი მისაღებია, თუ ის საერთო წესრიგს და პასუხისმგებლობას ქმნის.",
        "კოალიცია ძლიერია, როცა ლიდერობა ნდობას ეფუძნება.",
        "ერთად თამაში შეიძლება, მაგრამ მიმართულება მკაფიო უნდა იყოს.",
      ],
      threat: [
        "ზეწოლა ლიდერობას ვერ ცვლის. პროცესის მართვა უფრო ძლიერი ინსტრუმენტია.",
        "მუქარას ვხედავ, მაგრამ დღის წესრიგს მაინც მე შევინარჩუნებ.",
        "ლიდერი საფრთხეზე პანიკით კი არა, სტრატეგიით პასუხობს.",
      ],
      neutral: [
        "ჯერ წესრიგს ვაკვირდები და შემდეგ მივიღებ გადაწყვეტილებას.",
        "ლიდერობისთვის საჭიროა მოთმინება, არა მხოლოდ ხმამაღალი სვლა.",
        "სტრატეგიული დუმილიც ზოგჯერ ძალაუფლების ნაწილია.",
      ],
    },
  };

  const aiReplies = replies[behavior] || replies.diplomat;
  const intentReplies = aiReplies[intent] || aiReplies.neutral;
  const chosen = intentReplies[Math.floor(Math.random() * intentReplies.length)];

  return `${address}${chosen}`;
}
function countAllianceTiles(board: PlayedTile[], player1Id: string, player2Id: string): number {
  const allianceTiles = ["agreement", "partnership", "loyalty", "alliance", "friendship", "consensus"];
  let count = 0;

  board.forEach((tile) => {
    if (
      allianceTiles.includes(tile.baseId) &&
      ((tile.playedById === player1Id && tile.targetId === player2Id) ||
        (tile.playedById === player2Id && tile.targetId === player1Id))
    ) {
      count++;
    }
  });

  return count;
}

function checkVictoryConditions(
  currentBoard: PlayedTile[],
  hand: GameTile[],
  aiHands: Record<string, GameTile[]>,
  players: Player[],
  leaderId: string | null,
  leaderSinceTurn: number,
  currentTurn: number
): VictoryInfo | null {
  // 1. Individual win - someone has no tiles left
  if (hand.length === 0) {
    const humanPlayer = players.find((p) => p.id === "human");
    if (humanPlayer) {
      return {
        type: "individual",
        winners: [humanPlayer.name],
        winnerIds: ["human"],
        reason: `${humanPlayer.name} პირველმა დაცალა ყველა კენჭი.`,
      };
    }
  }

  aiPlayersBase.forEach((aiPlayer) => {
    if ((aiHands[aiPlayer.id]?.length || 0) === 0) {
      const aiPlayerObj = players.find((p) => p.id === aiPlayer.id);
      if (aiPlayerObj) {
        return {
          type: "individual",
          winners: [aiPlayerObj.name],
          winnerIds: [aiPlayer.id],
          reason: `${aiPlayerObj.name} პირველმა დაცალა ყველა კენჭი.`,
        };
      }
    }
  });

  // 2. Leader victory - leader maintains position for 5 turns
  if (leaderId && currentTurn - leaderSinceTurn >= 5) {
    const leader = players.find((p) => p.id === leaderId);
    if (leader) {
      return {
        type: "leader",
        winners: [leader.name],
        winnerIds: [leaderId],
        reason: `${leader.name} ლიდერად რჩება და ხელისუფლება დამკვიდრებულია.`,
      };
    }
  }

  // 3. Alliance victory - two players with 3+ shared red tiles, one has 2 or fewer tiles
  const playerIds = ["human", ...aiPlayersBase.map((p) => p.id)];
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      const p1Id = playerIds[i];
      const p2Id = playerIds[j];
      const sharedTiles = countAllianceTiles(currentBoard, p1Id, p2Id);

      if (sharedTiles >= 3) {
        const p1Hand = p1Id === "human" ? hand : aiHands[p1Id];
        const p2Hand = aiHands[p2Id];

        if ((p1Hand?.length || 0) <= 2 || (p2Hand?.length || 0) <= 2) {
          const p1 = players.find((p) => p.id === p1Id);
          const p2 = players.find((p) => p.id === p2Id);
          if (p1 && p2) {
            return {
              type: "alliance",
              winners: [p1.name, p2.name],
              winnerIds: [p1Id, p2Id],
              reason: `${p1.name} და ${p2.name} ალიანსი ჩამოიყალიბა და გაიმარჯვეს.`,
            };
          }
        }
      }
    }
  }

  return null;
}

function generatePlayerAssessment(board: PlayedTile[], hand: GameTile[], humanName: string): string {
  const allianceBases = ["agreement", "partnership", "loyalty", "alliance", "friendship", "consensus", "dialogue", "deal"];
  const blackBases = ["surveillance", "manipulation", "adventure", "falsification", "hacking", "leak", "betrayal", "retaliation", "bribery", "attack", "neutralize", "recruit"];
  const neutralBases = ["neutrality", "zero-red", "zero-black", "zero-yellow"];

  const activeBoard = board.filter((tile) => tile.playedById !== "system");
  const humanMoves = activeBoard.filter((tile) => tile.playedById === "human");

  const redTiles = humanMoves.filter((tile) => tile.color === "red").length;
  const blackTiles = humanMoves.filter((tile) => tile.color === "black").length;
  const yellowTiles = humanMoves.filter((tile) => tile.color === "yellow").length;
  const totalMoves = humanMoves.length;

  const allianceMoves = humanMoves.filter((tile) => allianceBases.includes(tile.baseId)).length;
  const aggressiveMoves = humanMoves.filter((tile) => blackBases.includes(tile.baseId)).length;
  const neutralMoves = humanMoves.filter((tile) => neutralBases.includes(tile.baseId) || tile.name === "0").length;
  const leaderMoves = humanMoves.filter((tile) => tile.symbol === "L").length;

  const aiIds = aiPlayersBase.map((player) => player.id);
  const allPlayerIds = ["human", ...aiIds];

  function displayName(playerId: string) {
    if (playerId === "human") return humanName;
    return aiPlayersBase.find((player) => player.id === playerId)?.name || playerId;
  }

  const playerStats = allPlayerIds.map((playerId) => {
    const moves = activeBoard.filter((tile) => tile.playedById === playerId);
    return {
      id: playerId,
      name: displayName(playerId),
      total: moves.length,
      red: moves.filter((tile) => tile.color === "red").length,
      black: moves.filter((tile) => tile.color === "black").length,
      yellow: moves.filter((tile) => tile.color === "yellow").length,
      alliances: moves.filter((tile) => allianceBases.includes(tile.baseId)).length,
      blackActions: moves.filter((tile) => blackBases.includes(tile.baseId)).length,
      neutral: moves.filter((tile) => neutralBases.includes(tile.baseId) || tile.name === "0").length,
      leaders: moves.filter((tile) => tile.symbol === "L").length,
    };
  });

  const mostAlliance = [...playerStats].sort((a, b) => b.alliances - a.alliances)[0];
  const mostBlack = [...playerStats].sort((a, b) => b.blackActions - a.blackActions)[0];
  const mostNeutral = [...playerStats].sort((a, b) => b.neutral - a.neutral)[0];
  const mostLeader = [...playerStats].sort((a, b) => b.leaders - a.leaders)[0];
  const mostActive = [...playerStats].sort((a, b) => b.total - a.total)[0];

  const humanStyle =
    allianceMoves >= aggressiveMoves && allianceMoves >= 2
      ? "კოალიციური სტრატეგი"
      : aggressiveMoves > allianceMoves && aggressiveMoves >= 2
        ? "კონფრონტაციული ტაქტიკოსი"
        : yellowTiles >= redTiles && yellowTiles >= blackTiles && yellowTiles > 0
          ? "რესურსებზე ორიენტირებული მოთამაშე"
          : leaderMoves > 0
            ? "ლიდერობის მაძიებელი"
            : neutralMoves > 0
              ? "ფრთხილი დამბალანსებელი"
              : "ვითარებაზე რეაგირებადი მოთამაშე";

  const politicalCulture =
    blackTiles > redTiles + yellowTiles
      ? "თქვენი თამაში უფრო მეტად ეფუძნებოდა ზეწოლას, რისკს და მოწინააღმდეგის შეზღუდვას. ასეთი სტილი მოკლევადიანად შედეგიანია, მაგრამ თუ მას ნდობის არხები არ ახლავს, მოთამაშე იზოლაციის საფრთხის წინაშე დგება."
      : redTiles >= blackTiles
        ? "თქვენი თამაში უფრო მეტად ეფუძნებოდა შეთანხმებას, კავშირის შექმნას და ურთიერთობის მართვას. ეს მიუთითებს პოლიტიკურ კულტურაზე, სადაც გამარჯვება მხოლოდ მოწინააღმდეგის დასუსტებით კი არა, წესრიგის შექმნითაც მიიღწევა."
        : "თქვენი თამაში ბალანსირებული იყო: იყენებდით როგორც თანამშრომლობას, ისე ზეწოლას. ასეთი სტილი მოქნილია, თუმცა საჭიროებს მკაფიო საზღვრებს, რომ ტაქტიკა შემთხვევითობად არ იქცეს.";

  const riskAnalysis =
    aggressiveMoves > allianceMoves
      ? "რისკის დონე მაღალი იყო. თქვენ ცდილობდით ინიციატივის სწრაფად მოპოვებას და მოწინააღმდეგეების შეზღუდვას. შემდეგ თამაშში სასურველია, აგრესიული სვლები წინასწარ მომზადებულ ალიანსებთან და რესურსებთან დააკავშიროთ."
      : allianceMoves > aggressiveMoves
        ? "რისკი ზომიერი იყო. თქვენ უფრო ხშირად ქმნიდით კავშირებს და ცდილობდით გავლენის დაგროვებას. ასეთი სტრატეგია სტაბილურია, თუმცა ზოგჯერ საჭიროებს უფრო მკაფიო ლიდერულ ნაბიჯს."
        : "რისკი საშუალო დონეზე დარჩა. თქვენ არც სრულ კონფრონტაციაში შესულხართ და არც მთლიანად შეთანხმებაზე აგიგიათ თამაში. ეს გაძლევთ მოქნილობას, მაგრამ ზოგჯერ ამცირებს მკაფიო იდენტობას.";

  const resourceAnalysis =
    yellowTiles > 2
      ? "რესურსული კენჭები აქტიურად გამოიყენეთ. ეს აჩვენებს, რომ მოლაპარაკებას მხოლოდ იდეებით კი არა, ფასით, მხარდაჭერითა და გაცვლითი ღირებულებითაც უყურებდით."
      : yellowTiles > 0
        ? "რესურსი გამოიყენეთ, მაგრამ არა დომინანტურად. მომავალში შეგიძლიათ თანხობრივი ან რესურსული კენჭები უფრო სტრატეგიულ მომენტებში ჩართოთ — განსაკუთრებით მაშინ, როცა შეთანხმება უნდა გამყარდეს."
        : "რესურსული განზომილება თითქმის არ გამოგიყენებიათ. პოლიტიკურ თამაშში გავლენა ხშირად იქმნება არა მხოლოდ პოზიციით, არამედ იმითაც, რა რესურსს სთავაზობ ან აკავებ.";

  const allianceAnalysis =
    allianceMoves >= 3
      ? "ალიანსების მიმართულებით აქტიური იყავით. თქვენ ხედავდით, რომ ერთპიროვნული თამაში ყოველთვის არ არის საკმარისი და გავლენის გასაზრდელად ურთიერთობების არქიტექტურა გჭირდებოდათ."
      : allianceMoves > 0
        ? "ალიანსის მცდელობა არსებობდა, თუმცა ის ბოლომდე სისტემურ სტრატეგიად არ ქცეულა. შემდეგ თამაშში სჯობს, უფრო ადრე განსაზღვროთ, ვინ არის დროებითი პარტნიორი და ვინ — გრძელვადიანი მოკავშირე."
        : "თქვენ უფრო დამოუკიდებლად ითამაშეთ. ეს ზრდის თავისუფლებას, მაგრამ ამცირებს მხარდაჭერის ქსელს. პოლიტიკაში იზოლირებული მოთამაშე ხშირად იძულებულია, ყველა კრიზისს მარტო უპასუხოს.";

  const strengths = [
    totalMoves > 5 ? "აქტიურად მონაწილეობდით პროცესში და თამაშის დინამიკას არ ჩამორჩით." : "ფრთხილად აკვირდებოდით პროცესს და ზედმეტი ნაბიჯებისგან თავს იკავებდით.",
    redTiles >= blackTiles ? "შეგეძლოთ თანამშრომლობისა და შეთანხმების ენის გამოყენება." : "გქონდათ მკაფიო ტაქტიკური სიმტკიცე და არ ერიდებოდით ზეწოლის გამოყენებას.",
    yellowTiles > 0 ? "რესურსის მნიშვნელობა დაინახეთ და ის თამაშის ნაწილად აქციეთ." : "თქვენი სვლები უფრო პოლიტიკურ პოზიციებზე იყო აგებული, ვიდრე რესურსულ გაცვლაზე.",
  ];

  const weaknesses = [
    allianceMoves < 2 ? "ალიანსები უფრო ადრე და მიზანმიმართულად უნდა აგეგოთ." : "ალიანსების შენარჩუნება ისეთივე მნიშვნელოვანია, როგორც მათი შექმნა.",
    aggressiveMoves > allianceMoves + 1 ? "შავი სვლების ჭარბმა გამოყენებამ შეიძლება ნდობის დეფიციტი შექმნას." : "ზოგჯერ უფრო მკაფიო ძალის დემონსტრირებაც საჭიროა, რომ ინიციატივა არ დაკარგოთ.",
    leaderMoves === 0 ? "ლიდერობის კენჭი ან ლიდერული როლი ჯერ მკაფიოდ არ გამოგიკვეთავთ." : "ლიდერობის გამოცხადებას სჭირდება მხარდაჭერის შენარჩუნება და არა მხოლოდ სიმბოლური სვლა.",
  ];

  const recommendations = [
    "შემდეგ თამაშში პირველივე რამდენიმე სვლაში განსაზღვრეთ, გინდათ იყოთ კოალიციის არქიტექტორი, ლიდერი, დამბალანსებელი თუ ტაქტიკური შემტევი.",
    "თუ შავ სვლას იყენებთ, წინასწარ შექმენით პოლიტიკური საფარი — ალიანსი, რესურსი ან მოლაპარაკების არხი.",
    "ნეიტრალიტეტი გამოიყენეთ როგორც დროებითი ტაქტიკა და არა როგორც მუდმივი თავშესაფარი.",
    "ყვითელი კენჭები გამოიყენეთ მაშინ, როცა შეთანხმებას სჭირდება ფასი, გარანტია ან კომპენსაცია.",
    "ლიდერობა გაამყარეთ არა მხოლოდ L კენჭით, არამედ თანმიმდევრული ქცევით: შეთანხმება, პასუხისმგებლობა, დაცვა და დროული გადაწყვეტილება.",
  ];

  const processSummary = playerStats
    .map((stat) => {
      const profile =
        stat.alliances >= stat.blackActions && stat.alliances > 0
          ? "ალიანსებზე ორიენტირებული"
          : stat.blackActions > stat.alliances && stat.blackActions > 0
            ? "ზეწოლაზე ორიენტირებული"
            : stat.neutral > 0
              ? "ნეიტრალური/დამბალანსებელი"
              : stat.leaders > 0
                ? "ლიდერობაზე ორიენტირებული"
                : "ფრთხილი ან ეპიზოდური";
      return `- ${stat.name}: ${profile}; სულ სვლები — ${stat.total}, წითელი — ${stat.red}, შავი — ${stat.black}, ყვითელი — ${stat.yellow}.`;
    })
    .join("\n");

  const historicalParallel =
    "ისტორიული პარალელისთვის შეგვიძლია გავიხსენოთ ნელსონ მანდელას პოლიტიკური ხაზი სამხრეთ აფრიკის გარდამავალ პერიოდში: მისი წარმატება მხოლოდ ძალაუფლების მოპოვებაში არ ყოფილა; მთავარი იყო მოწინააღმდეგეებთან დიალოგის შენარჩუნება, შურისძიების ციკლის შემცირება და ისეთი წესრიგის შექმნა, რომელშიც გამარჯვება საერთო მომავალზე გადაითარგმნა. ამ თამაშთან კავშირი ის არის, რომ ძლიერი მოთამაშე მხოლოდ მაშინ ხდება სტრატეგი, როცა შეუძლია მოწინააღმდეგის დამარცხებასთან ერთად ურთიერთობის ახალი წესიც შექმნას.";

  return `საბოლოო პოლიტიკური ანალიზი — ${humanName}

სტრატეგიული პროფილი: ${humanStyle}

1. თამაშის საერთო პოლიტიკური სურათი

ეს თამაში განვითარდა როგორც გავლენის, ალიანსების, რესურსებისა და ზეწოლის მრავალმხრივი პროცესი. დაფაზე გამოჩნდა როგორც თანამშრომლობითი პოლიტიკის ნიშნები, ისე კონკურენციისა და კონფრონტაციის ელემენტები. ასეთ გარემოში გამარჯვება დამოკიდებული არ არის მხოლოდ ერთ ძლიერ სვლაზე; გადამწყვეტია სვლების თანმიმდევრობა, მოთამაშეთა შორის ნდობის ხარისხი და ის, რამდენად სწორად კითხულობს მოთამაშე ძალთა ბალანსს.

თამაშში სულ დაფიქსირდა ${activeBoard.length} აქტიური სვლა. თქვენი სვლების რაოდენობა იყო ${totalMoves}. ხელში დაგრჩათ ${hand.length} კენჭი, რაც აჩვენებს, რამდენად სწრაფად ან ფრთხილად ხარჯავდით საკუთარ შესაძლებლობებს.

2. თქვენი პოლიტიკური სტრატეგია

თქვენი წითელი სვლები: ${redTiles}
თქვენი შავი სვლები: ${blackTiles}
თქვენი ყვითელი სვლები: ${yellowTiles}
ალიანსური/თანამშრომლობითი სვლები: ${allianceMoves}
ზეწოლის/კონფრონტაციის სვლები: ${aggressiveMoves}
ნეიტრალური ან შემაკავებელი სვლები: ${neutralMoves}
ლიდერობის სვლები: ${leaderMoves}

${politicalCulture}

3. პოლიტიკური ფსიქოლოგია და მოქმედების სტილი

თქვენი თამაში აჩვენებს, რომ გადაწყვეტილებებს იღებდით არა მხოლოდ კონკრეტული კენჭის მიხედვით, არამედ იმ გარემოს მიხედვითაც, რომელიც სხვა მოთამაშეებმა შექმნეს. თუ ხშირად იყენებდით წითელ სვლებს, ეს მიანიშნებს ნდობისა და თანამშრომლობის სივრცის შექმნაზე. თუ შავი სვლები ჭარბობდა, თქვენი ფსიქოლოგიური სტილი უფრო მეტად უკავშირდებოდა ძალის დემონსტრირებას, კონტროლს და მოწინააღმდეგის შეზღუდვას. თუ ყვითელი სვლები გამოჩნდა, თქვენ ხედავდით, რომ პოლიტიკაში რესურსი ხშირად ისეთივე მნიშვნელოვანი არგუმენტია, როგორც სიტყვა ან პოზიცია.

4. ალიანსები, შავი სვლები, ნეიტრალიტეტი და ლიდერობა

ყველაზე მეტად ალიანსებს ქმნიდა: ${mostAlliance?.alliances ? mostAlliance.name : "გამოკვეთილი ალიანსური ლიდერი არ გამოჩნდა"}.
ყველაზე ხშირად შავ სვლებს იყენებდა: ${mostBlack?.blackActions ? mostBlack.name : "შავი სვლები დომინანტური არ ყოფილა"}.
ყველაზე ნეიტრალური მოთამაშე იყო: ${mostNeutral?.neutral ? mostNeutral.name : "ნეიტრალური მოთამაშე მკაფიოდ არ გამოჩნდა"}.
ლიდერობის ყველაზე მკაფიო პრეტენზია ჰქონდა: ${mostLeader?.leaders ? mostLeader.name : "ლიდერობა სიმბოლურად არ გამოკვეთილა"}.
ყველაზე აქტიური მოთამაშე იყო: ${mostActive?.name || "მონაცემი არ არის"}.

მოთამაშეთა პროცესის მოკლე რუკა:
${processSummary}

5. თქვენი ძლიერი მხარეები

- ${strengths[0]}
- ${strengths[1]}
- ${strengths[2]}

6. სუსტი მხარეები და რისკები

- ${weaknesses[0]}
- ${weaknesses[1]}
- ${weaknesses[2]}

7. რისკის შეფასება

${riskAnalysis}

8. ალიანსების შეფასება

${allianceAnalysis}

9. რესურსების გამოყენება

${resourceAnalysis}

10. რეკომენდაციები შემდეგი თამაშისთვის

1. ${recommendations[0]}
2. ${recommendations[1]}
3. ${recommendations[2]}
4. ${recommendations[3]}
5. ${recommendations[4]}

11. დადებითი ისტორიული პარალელი

${historicalParallel}

12. საბოლოო დასკვნა

თქვენი თამაში შეიძლება შეფასდეს როგორც „${humanStyle}“-ის სტილი. შემდეგ ეტაპზე მთავარი ამოცანაა, თქვენი სვლები უფრო მკაფიო პოლიტიკურ ხაზად ჩამოყალიბდეს: ვინ ხართ თამაშში — ლიდერი, მოლაპარაკე, დამბალანსებელი, რესურსების მმართველი თუ ტაქტიკური შემტევი. რაც უფრო ადრე განსაზღვრავთ საკუთარ როლს, მით უფრო ეფექტურად გამოიყენებთ კენჭებს, ალიანსებს და პოლიტიკურ დროს.`;
}
export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const roomId = String(params.roomId || "ROOM");
  const mode = searchParams.get("mode") || "solo";
  const playerName = searchParams.get("name") || "მოთამაშე";
  const avatarId = searchParams.get("avatar") || "strategist";
  const seatId = searchParams.get("seat") || "human";
  const playerId = searchParams.get("playerId") || "";
  const roomRealPlayers = Number(searchParams.get("realPlayers") || "2");
  const localSeatId = mode === "group" ? seatId : "human";

  const [setup] = useState(() => createGameSetup(roomId));
  const [hand, setHand] = useState<GameTile[]>(setup.humanHand);
  const [marketDeck, setMarketDeck] = useState<GameTile[]>(setup.market);
  const [aiHands, setAiHands] = useState<Record<string, GameTile[]>>(setup.aiHands);
  const [roomPlayers, setRoomPlayers] = useState<Record<string, RoomPlayerRecord>>({});

  const [board, setBoard] = useState<PlayedTile[]>([
    {
      ...setup.startTile,
      id: "start-board",
      playedBy: "სისტემა",
      playedById: "system",
      moveType: "start",
      x: 50,
      y: 18,
      orientation: "vertical",
    },
  ]);

  const [selectedTileId, setSelectedTileId] = useState(setup.humanHand[0]?.id || "");
  const [selectedAnchorId, setSelectedAnchorId] = useState("start-board");
  const [selectedSide, setSelectedSide] = useState<AttachSide>("bottom");
  const [selectedOrientation, setSelectedOrientation] = useState<TileOrientation>("vertical");
  const [draggedTileId, setDraggedTileId] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [chatMode, setChatMode] = useState<ChatMode>("public");
  const [privateTarget, setPrivateTarget] = useState("ai-1");
  const [chatInput, setChatInput] = useState("");
  const [navigatorText, setNavigatorText] = useState(
    "გადაასრიალე კენჭი დაფაზე არსებულ კენჭზე. თუ სვლა არასწორია, აქ გამოჩნდება მიზეზი."
  );
  const [currentTurnId, setCurrentTurnId] = useState("human");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [moveSpotlight, setMoveSpotlight] = useState<MoveSpotlight | null>(null);
  const [lastPlacedTileId, setLastPlacedTileId] = useState<string | null>(null);
  const [lastMoveTimestamp, setLastMoveTimestamp] = useState<number>(0);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: "chat-1", author: "ნინო AI", text: "ჩატი მზადაა.", type: "ai", mode: "public" },
  ]);

  const [log, setLog] = useState<string[]>([
    "თქვენი ჯერია — აირჩიეთ კენჭი და გადაასრიალეთ მაგიდაზე.",
    "სისტემამ დადო საწყისი კენჭი „სვლა“.",
    "თამაში დაიწყო. ყველა მოთამაშემ მიიღო 6 კენჭი.",
  ]);

  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [leaderSinceTurn, setLeaderSinceTurn] = useState<number>(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [victoryInfo, setVictoryInfo] = useState<VictoryInfo | null>(null);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
const [showAssessmentModal, setShowAssessmentModal] = useState(false);
const [humanObserverMode, setHumanObserverMode] = useState(false);
const [turnCounter, setTurnCounter] = useState(0);
  const [sharedHydrated, setSharedHydrated] = useState(mode !== "group");
  const lastSharedStateRef = useRef("");
  const canWriteSharedStateRef = useRef(mode !== "group");
  const lastLocalChangeAtRef = useRef(0);

  useEffect(() => {
    if (mode !== "group" || !isSupabaseConfigured || !supabase) return;

    let alive = true;

    async function loadSharedRoomPlayers() {
      const { data } = await supabase!
        .from("svlebi_room_players")
        .select("seat_id,name,avatar,is_host")
        .eq("room_code", roomId);

      if (!alive) return;

      const nextPlayers: Record<string, RoomPlayerRecord> = {};

      (data || []).forEach((player) => {
        nextPlayers[player.seat_id] = {
          name: player.name,
          avatar: player.avatar,
          is_host: Boolean(player.is_host),
        };
      });

      setRoomPlayers(nextPlayers);
    }

    loadSharedRoomPlayers();

    const channel = supabase!
      .channel(`svlebi-room-players-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "svlebi_room_players",
          filter: `room_code=eq.${roomId}`,
        },
        () => loadSharedRoomPlayers()
      )
      .subscribe();

    return () => {
      alive = false;
      supabase!.removeChannel(channel);
    };
  }, [mode, roomId]);

  function markSharedLocalChange() {
    if (mode === "group") {
      canWriteSharedStateRef.current = true;
      lastLocalChangeAtRef.current = Date.now();
    }
  }

  function buildSharedStateSnapshot(): SharedRoomState {
    return {
      board,
      hand,
      aiHands,
      marketDeck,
      log,
      currentTurnId,
      leaderId,
      leaderSinceTurn,
      turnCounter,
      winner,
      victoryInfo,
      gameEnded,
    };
  }

  function applySharedState(state: Partial<SharedRoomState> | null) {
    if (!state) return;

    if (state.board) setBoard(state.board);
    if (state.hand) setHand(state.hand);
    if (state.aiHands) setAiHands(state.aiHands);
    if (state.marketDeck) setMarketDeck(state.marketDeck);
    if (state.log) setLog(state.log);
    if (state.currentTurnId) setCurrentTurnId(state.currentTurnId);
    if (typeof state.leaderId !== "undefined") setLeaderId(state.leaderId);
    if (typeof state.leaderSinceTurn === "number") setLeaderSinceTurn(state.leaderSinceTurn);
    if (typeof state.turnCounter === "number") setTurnCounter(state.turnCounter);
    if (typeof state.winner !== "undefined") setWinner(state.winner);
    if (typeof state.victoryInfo !== "undefined") setVictoryInfo(state.victoryInfo);
    if (typeof state.gameEnded === "boolean") setGameEnded(state.gameEnded);
  }

  function getManualSeatIds() {
    if (mode !== "group") return ["human"];

    return SEAT_ORDER.filter((id) => id === "human" || Boolean(roomPlayers[id]));
  }

  function getNextManualSeat(afterSeatId: string) {
    const manualSeats = getManualSeatIds();

    if (manualSeats.length === 0) return "human";

    const index = manualSeats.indexOf(afterSeatId);

    if (index === -1) return manualSeats[0];

    return manualSeats[(index + 1) % manualSeats.length];
  }

  function isSeatControlledByRealPlayer(targetSeatId: string) {
    if (mode !== "group") return targetSeatId === "human";
    return targetSeatId === "human" || Boolean(roomPlayers[targetSeatId]);
  }

  useEffect(() => {
    if (mode !== "group" || !isSupabaseConfigured || !supabase) return;

    let alive = true;

    async function loadSharedGameState() {
      const { data } = await supabase!
        .from("svlebi_rooms")
        .select("game_state")
        .eq("room_code", roomId)
        .maybeSingle();

      if (!alive) return;

      const state = data?.game_state as SharedRoomState | null;

      if (state) {
        lastSharedStateRef.current = JSON.stringify(state);
        canWriteSharedStateRef.current = false;
        applySharedState(state);
      } else if (localSeatId === "human") {
        const initialState = buildSharedStateSnapshot();
        const serialized = JSON.stringify(initialState);
        lastSharedStateRef.current = serialized;

        await supabase!
          .from("svlebi_rooms")
          .upsert(
            {
              room_code: roomId,
              real_players: Number.isFinite(roomRealPlayers) ? roomRealPlayers : 2,
              game_state: initialState,
              status: "playing",
            },
            { onConflict: "room_code" }
          );
      }

      setSharedHydrated(true);
    }

    loadSharedGameState();

    const channel = supabase!
      .channel(`svlebi-game-state-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "svlebi_rooms",
          filter: `room_code=eq.${roomId}`,
        },
        (payload) => {
          const nextState = payload.new?.game_state as SharedRoomState | null;
          if (!nextState) return;

          const serialized = JSON.stringify(nextState);
          if (serialized === lastSharedStateRef.current) return;
          if (Date.now() - lastLocalChangeAtRef.current < 3500) return;

          lastSharedStateRef.current = serialized;
          canWriteSharedStateRef.current = false;
          applySharedState(nextState);
          setSharedHydrated(true);
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase!.removeChannel(channel);
    };
  }, [mode, roomId, localSeatId]);

  useEffect(() => {
    if (mode !== "group" || !sharedHydrated || !isSupabaseConfigured || !supabase) return;

    if (!canWriteSharedStateRef.current) return;

    const nextState = buildSharedStateSnapshot();
    const serialized = JSON.stringify(nextState);

    if (serialized === lastSharedStateRef.current) return;

    lastSharedStateRef.current = serialized;

    const timer = window.setTimeout(() => {
      supabase!
        .from("svlebi_rooms")
        .upsert(
          {
            room_code: roomId,
            real_players: Number.isFinite(roomRealPlayers) ? roomRealPlayers : 2,
            game_state: nextState,
            status: gameEnded ? "ended" : "playing",
          },
          { onConflict: "room_code" }
        );
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    mode,
    sharedHydrated,
    roomId,
    board,
    hand,
    aiHands,
    marketDeck,
    log,
    currentTurnId,
    leaderId,
    leaderSinceTurn,
    turnCounter,
    winner,
    victoryInfo,
    gameEnded,
    roomRealPlayers,
  ]);

  useEffect(() => {
    if (mode !== "group" || !sharedHydrated || !isSupabaseConfigured || !supabase) return;

    const pollId = window.setInterval(async () => {
      const { data } = await supabase!
        .from("svlebi_rooms")
        .select("game_state")
        .eq("room_code", roomId)
        .maybeSingle();

      const nextState = data?.game_state as SharedRoomState | null;

      if (!nextState) return;

      const serialized = JSON.stringify(nextState);

      if (serialized === lastSharedStateRef.current) return;
      if (Date.now() - lastLocalChangeAtRef.current < 3500) return;

      lastSharedStateRef.current = serialized;
      canWriteSharedStateRef.current = false;
      applySharedState(nextState);
    }, 1200);

    return () => window.clearInterval(pollId);
  }, [mode, roomId, sharedHydrated]);

  // svlebi-game-state-polling

  const players: Player[] = useMemo(() => {
    const hostRecord = roomPlayers.human;
    const hostAvatarId =
      mode === "group"
        ? hostRecord?.avatar || (seatId === "human" ? avatarId : "strategist")
        : avatarId;

    const hostName =
      mode === "group"
        ? hostRecord?.name || (seatId === "human" ? playerName : "მასპინძელი")
        : playerName;

    return [
      {
        id: "human",
        name: hostName,
        avatar: avatarMap[hostAvatarId] || avatarMap[avatarId] || "🧑🏻‍💼",
        type: "human",
        tileCount: hand.length,
      },
      ...aiPlayersBase.map((player) => {
        const realSeatPlayer = roomPlayers[player.id];

        return {
          id: player.id,
          name: realSeatPlayer?.name || player.name,
          avatar: realSeatPlayer
            ? avatarMap[realSeatPlayer.avatar] || player.avatar
            : player.avatar,
          type: realSeatPlayer ? ("human" as const) : ("ai" as const),
          tileCount: aiHands[player.id]?.length || 0,
        };
      }),
    ];
  }, [aiHands, avatarId, hand.length, mode, playerName, roomPlayers, seatId]);

  const currentPlayerHand = useMemo(() => {
    if (localSeatId === "human") return hand;
    return aiHands[localSeatId] || [];
  }, [aiHands, hand, localSeatId]);

  useEffect(() => {
    if (currentPlayerHand.length === 0) {
      if (selectedTileId) setSelectedTileId("");
      return;
    }

    const selectedStillExists = currentPlayerHand.some((tile) => tile.id === selectedTileId);

    if (!selectedStillExists) {
      setSelectedTileId(currentPlayerHand[0].id);
    }
  }, [currentPlayerHand, selectedTileId]);

  // sync selected tile with current player hand

  const boardScale =
    board.length > 30 ? 0.5 : board.length > 22 ? 0.58 : board.length > 14 ? 0.7 : 0.84;

  function playSound(type: "tile" | "chat") {
    if (!soundOn || typeof window === "undefined") return;

    const audioWindow = window as Window &
      typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = window.AudioContext || audioWindow.webkitAudioContext;

    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type === "tile" ? "triangle" : "sine";
    oscillator.frequency.value = type === "tile" ? 180 : 620;
    gain.gain.setValueAtTime(type === "tile" ? 0.12 : 0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.14);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.14);
  }

  function getPlayerName(playerId: string) {
    return players.find((player) => player.id === playerId)?.name || "მოთამაშე";
  }

  function getPlayerById(playerId: string) {
    return players.find((player) => player.id === playerId) || players[0];
  }

  function chooseTarget(anchor: PlayedTile) {
    if (mode === "group") {
      const nextManualSeat = getNextManualSeat(localSeatId);
      if (nextManualSeat && nextManualSeat !== localSeatId) {
        return nextManualSeat;
      }
    }

    if (anchor.playedById !== "human" && anchor.playedById !== "system") {
      return anchor.playedById;
    }

    const index = board.length % aiPlayersBase.length;
    return aiPlayersBase[index].id;
  }

  function validateMove(tile: GameTile | undefined, anchor: PlayedTile) {
    if (!tile) return "ჯერ უნდა აირჩიო კენჭი.";
    if (humanObserverMode) return "თქვენ უკვე დაასრულეთ თამაში და ახლა დამკვირვებლის რეჟიმში ხართ.";
    if (winner) return "თამაში უკვე დასრულებულია.";
    if (mode !== "group" && currentTurnId !== localSeatId) {
      return "ახლა თქვენი სვლა არ არის. დაელოდეთ თქვენს რიგს.";
    }
    if (isAiThinking) return "დაელოდე AI მოთამაშეების სვლას. შემდეგ ისევ შენი ჯერი დაბრუნდება.";
    if (!anchor) return "აირჩიეთ ადგილი დაფაზე რომელზეც კენჭი დაიდება.";
    if (board.length === 0 && tile.baseId !== "start-green") {
      return 'პირველი სვლა მხოლოდ "სვლა" კენჭით შეიძლება.';
    }

    if (isFunctionalColor(tile.color) && tile.color === anchor.color) {
      return `ეს სვლა ვერ განხორციელდება: ${
        tile.color === "red" ? "წითელი" : "შავი"
      } ფუნქციური კენჭი იმავე ფერის კენჭს პირდაპირ არ ებმის.`;
    }

    if (tile.color === "yellow" && anchor.moveType === "start") {
      return "თანხის კენჭი პირდაპირ საწყის „სვლა“ კენჭზე ვერ დაიდება. ჯერ საჭიროა პოლიტიკური წინადადება ან პასუხი.";
    }

    if (tile.name === "0" && anchor.moveType === "start") {
      return "„0“ საწყის კენჭზე პირდაპირ ვერ დაიდება. ის გამოიყენება პასუხად, აცილებად ან კონკრეტული წინადადების გასანეიტრალებლად.";
    }

    return null;
  }

  function pickAiTileFromHands(hands: Record<string, GameTile[]>, aiId: string, anchorColor: TileColor) {
    const aiHand = hands[aiId] || [];
    if (aiHand.length === 0) return undefined;

    const preferredColor = getAiPreferredTileColor(aiId);
    const preferredSymbols = getAiPreferredTileSymbols(aiId);

    // Try to find preferred tile based on behavior profile
    if (preferredColor) {
      const preferredTile = aiHand.find(
        (tile) => tile.color === preferredColor && (!isFunctionalColor(tile.color) || tile.color !== anchorColor)
      );
      if (preferredTile) return preferredTile;
    }

    // Try to find preferred symbols (for leader profile)
    if (preferredSymbols.length > 0) {
      const preferredTile = aiHand.find(
        (tile) =>
          preferredSymbols.includes(tile.symbol) &&
          (!isFunctionalColor(tile.color) || tile.color !== anchorColor)
      );
      if (preferredTile) return preferredTile;
    }

    // Try to find any valid tile (not conflicting with anchor color)
    const validTile = aiHand.find((tile) => !isFunctionalColor(tile.color) || tile.color !== anchorColor);
    if (validTile) return validTile;

    // Fallback to first available tile
    return aiHand[0];
  }

  function buildAiPlayedTile(
    actorId: string,
    targetId: string,
    anchor: PlayedTile,
    tile: GameTile,
    currentBoard: PlayedTile[],
    side: AttachSide
  ): PlayedTile {
    const rawPos = getPositionBySide(anchor, side, currentBoard.length);
    const safePos = findSafePosition(rawPos.x, rawPos.y, currentBoard);

    return {
      ...tile,
      id: makeId(`${tile.baseId}-ai`),
      playedBy: getPlayerName(actorId),
      playedById: actorId,
      targetName: getPlayerName(targetId),
      targetId,
      moveType: "ai",
      parentId: anchor.id,
      x: safePos.x,
      y: safePos.y,
      orientation: currentBoard.length % 2 === 0 ? "horizontal" : "vertical",
    };
  }

  function chooseIndependentAiActor(excludeId: string, hands: Record<string, GameTile[]>) {
    const available = aiPlayersBase.filter(
      (player) => player.id !== excludeId && !isSeatControlledByRealPlayer(player.id) && (hands[player.id]?.length || 0) > 0
    );

    if (available.length === 0) return null;

    return available[board.length % available.length];
  }

  function setSpotlight(actorId: string, targetName: string, actionLabel: string, phrase: string) {
    const actor = getPlayerById(actorId);

    setMoveSpotlight({
      actorId,
      actorName: actor.name,
      targetName,
      actionLabel,
      phrase,
    });
  }

  function playTileOnAnchor(anchor: PlayedTile, forcedTileId?: string, forcedSide?: AttachSide) {
    const tileToPlay = currentPlayerHand.find((tile) => tile.id === (forcedTileId || selectedTileId));
    const validationError = validateMove(tileToPlay, anchor);

    if (validationError) {
      setNavigatorText(validationError);
      setDraggedTileId(null);
      return;
    }

    markSharedLocalChange();

    const targetId = chooseTarget(anchor);
    const targetName = getPlayerName(targetId);

    const sideToUse = forcedSide || selectedSide;
    const rawPos = getPositionBySide(anchor, sideToUse, board.length);
    const safePos = findSafePosition(rawPos.x, rawPos.y, board);

    const humanPlayedTile: PlayedTile = {
      ...tileToPlay!,
      id: makeId(`${tileToPlay!.baseId}-human`),
      playedBy: getPlayerName(localSeatId),
      playedById: localSeatId,
      targetName,
      targetId,
      moveType: "human",
      parentId: anchor.id,
      x: safePos.x,
      y: safePos.y,
      orientation: selectedOrientation,
    };

    const remainingHand = currentPlayerHand.filter((tile) => tile.id !== tileToPlay!.id);
    const boardAfterHuman = [...board, humanPlayedTile];

    setIsAiThinking(true);
    setCurrentTurnId(targetId);
    if (localSeatId === "human") {
      setHand(remainingHand);
    } else {
      setAiHands((previous) => ({
        ...previous,
        [localSeatId]: remainingHand,
      }));
    }

    setSelectedTileId(remainingHand[0]?.id || "");
    setSelectedAnchorId(humanPlayedTile.id);
    setBoard(boardAfterHuman);
    setLastPlacedTileId(humanPlayedTile.id);
    setLastMoveTimestamp(Date.now());
    setDraggedTileId(null);
    setNavigatorText(`${tileToPlay!.name}: ${tileToPlay!.description}`);
    setSpotlight(localSeatId, targetName, tileToPlay!.name, "ვაკეთებ ჩემს სვლას.");

    setLog((previous) => [
      `${getPlayerName(localSeatId)}-მა დადო კენჭი „${tileToPlay!.name}“ მოთამაშის მიმართ: ${targetName}.`,
      ...previous,
    ]);

    playSound("tile");

    // Track leader (L tiles)
    if (tileToPlay!.symbol === "L") {
      setLeaderId(localSeatId);
      setLeaderSinceTurn(board.length);
    }

    if (remainingHand.length === 0) {
      setWinner(getPlayerName(localSeatId));
      setLog((previous) => [`თამაში დასრულდა — ${getPlayerName(localSeatId)}-მა პირველმა დაცალა კენჭები.`, ...previous]);
      setNavigatorText("გილოცავ! შენ პირველმა დაცალე კენჭები.");
      setVictoryInfo({
        type: "individual",
        winners: [getPlayerName(localSeatId)],
        winnerIds: [localSeatId],
        reason: `${getPlayerName(localSeatId)} პირველმა დაცალა ყველა კენჭი.`,
      });
      setGameEnded(true);
      setShowVictoryModal(true);
      setIsAiThinking(false);
      setCurrentTurnId("human");
      return;
    }

    const targetIsRealControlled = isSeatControlledByRealPlayer(targetId);

    if (targetIsRealControlled && targetId !== localSeatId) {
      setCurrentTurnId(targetId);
      setIsAiThinking(false);
      setLog((previous) => [
        `${targetName}-ის რიგია. დაელოდეთ მის სვლას.`,
        ...previous,
      ]);
      return;
    }

    const aiResponseTile = pickAiTileFromHands(aiHands, targetId, tileToPlay!.color);

    setTimeout(() => {
      let boardAfterResponse = boardAfterHuman;

      if (aiResponseTile) {
        const phrase = aiPhrases[boardAfterHuman.length % aiPhrases.length];

        const aiReply = buildAiPlayedTile(
          targetId,
          "human",
          humanPlayedTile,
          aiResponseTile,
          boardAfterHuman,
          oppositeSide(sideToUse)
        );

        boardAfterResponse = [...boardAfterHuman, aiReply];

        setBoard(boardAfterResponse);
        setLastPlacedTileId(aiReply.id);
        setLastMoveTimestamp(Date.now());
        setSelectedAnchorId(aiReply.id);
        setAiHands((previous) => ({
          ...previous,
          [targetId]: (previous[targetId] || []).filter((tile) => tile.id !== aiResponseTile.id),
        }));

        setSpotlight(targetId, playerName, aiReply.name, phrase);

        setLog((previous) => [
          `${targetName}-მა უპასუხა კენჭით „${aiReply.name}“.`,
          ...previous,
        ]);

        playSound("tile");
      } else {
        setLog((previous) => [`${targetName}-ს საპასუხო კენჭი არ ჰქონდა.`, ...previous]);
      }

      const independentActor = chooseIndependentAiActor(targetId, aiHands);

      if (!independentActor) {
        setCurrentTurnId(getNextManualSeat(localSeatId));
        setIsAiThinking(false);
        return;
      }

      setCurrentTurnId(independentActor.id);

      setTimeout(() => {
        const independentTile = pickAiTileFromHands(
          aiHands,
          independentActor.id,
          boardAfterResponse[boardAfterResponse.length - 1].color
        );

        if (!independentTile) {
          setCurrentTurnId(getNextManualSeat(localSeatId));
          setIsAiThinking(false);
          return;
        }

        const possibleTargets = players.filter((player) => player.id !== independentActor.id);
        const independentTarget = possibleTargets[boardAfterResponse.length % possibleTargets.length];

        const phrase = aiPhrases[(boardAfterResponse.length + 3) % aiPhrases.length];

        const independentMove = buildAiPlayedTile(
          independentActor.id,
          independentTarget.id,
          boardAfterResponse[boardAfterResponse.length - 1],
          independentTile,
          boardAfterResponse,
          boardAfterResponse.length % 2 === 0 ? "right" : "bottom"
        );

        setBoard((previous) => [...previous, independentMove]);
        setLastPlacedTileId(independentMove.id);
        setLastMoveTimestamp(Date.now());
        setSelectedAnchorId(independentMove.id);
        setAiHands((previous) => ({
          ...previous,
          [independentActor.id]: (previous[independentActor.id] || []).filter(
            (tile) => tile.id !== independentTile.id
          ),
        }));

        setSpotlight(independentActor.id, independentTarget.name, independentMove.name, phrase);

        setLog((previous) => [
          `${independentActor.name}-მა დადო კენჭი „${independentMove.name}“ მოთამაშის მიმართ: ${independentTarget.name}.`,
          ...previous,
        ]);

        playSound("tile");

        setTimeout(() => {
          setCurrentTurnId(getNextManualSeat(localSeatId));
          setIsAiThinking(false);
        }, 1200);
      }, AI_MOVE_DELAY);
    }, AI_MOVE_DELAY);
  }
function continueAiGameAsObserver() {
  markSharedLocalChange();
  setHumanObserverMode(true);
  setShowVictoryModal(false);
  setGameEnded(false);
  setDraggedTileId(null);
  setSelectedTileId("");
  setIsAiThinking(true);

  setNavigatorText(
    "თქვენ დაასრულეთ თამაში და დარჩით დამკვირვებლის რეჟიმში. დარჩენილი მოთამაშეები პარტიას ბოლომდე აგრძელებენ."
  );

  setLog((previous) => [
    `${playerName}-მა თამაში დაასრულა და დარჩა დამკვირვებლის რეჟიმში.`,
    ...previous,
  ]);

  const localHands: Record<string, GameTile[]> = {};
  Object.keys(aiHands).forEach((key) => {
    localHands[key] = [...(aiHands[key] || [])];
  });

  let localBoard = [...board];

  const makeNextObserverMove = () => {
    const activeAiPlayers = aiPlayersBase.filter(
      (player) => (localHands[player.id]?.length || 0) > 0
    );

    if (activeAiPlayers.length === 0) {
      setIsAiThinking(false);
      setGameEnded(true);
      setCurrentTurnId("human");
      setNavigatorText(
        "დარჩენილმა მოთამაშეებმაც დაასრულეს პარტია. შეგიძლიათ ნახოთ შეფასება ან დაბრუნდეთ მთავარ გვერდზე."
      );
      setLog((previous) => [
        "დამკვირვებლის რეჟიმში დარჩენილი პარტია დასრულდა.",
        ...previous,
      ]);
      return;
    }

    const actor = activeAiPlayers[localBoard.length % activeAiPlayers.length];
    const anchor = localBoard[localBoard.length - 1];
    const tile = pickAiTileFromHands(localHands, actor.id, anchor.color);

    if (!tile) {
      localHands[actor.id] = [];
      setTimeout(makeNextObserverMove, 700);
      return;
    }

    const targetPool = aiPlayersBase.filter((player) => player.id !== actor.id);
    const target = targetPool[localBoard.length % targetPool.length] || targetPool[0];

    const side: AttachSide = localBoard.length % 2 === 0 ? "right" : "bottom";
    const phrase = aiPhrases[localBoard.length % aiPhrases.length];

    const aiMove = buildAiPlayedTile(
      actor.id,
      target.id,
      anchor,
      tile,
      localBoard,
      side
    );

    localBoard = [...localBoard, aiMove];
    localHands[actor.id] = (localHands[actor.id] || []).filter(
      (item) => item.id !== tile.id
    );

    setBoard([...localBoard]);
    setAiHands({ ...localHands });
    setCurrentTurnId(actor.id);
    setLastPlacedTileId(aiMove.id);
    setLastMoveTimestamp(Date.now());
    setSelectedAnchorId(aiMove.id);
    setSpotlight(actor.id, target.name, aiMove.name, phrase);

    setLog((previous) => [
      `${actor.name}-მა დამკვირვებლის რეჟიმში დადო კენჭი „${aiMove.name}“ მოთამაშის მიმართ: ${target.name}.`,
      ...previous,
    ]);

    playSound("tile");

    setTimeout(makeNextObserverMove, 1600);
  };

  setTimeout(makeNextObserverMove, 900);
}
  function drawFromMarket() {
    if (humanObserverMode) {
      setNavigatorText("თქვენ უკვე დაასრულეთ თამაში და ახლა დამკვირვებლის რეჟიმში ხართ.");
      return;
    }

    if (winner) return;

    if (marketDeck.length <= 0) {
      setNavigatorText("ბაზარი ცარიელია. აღარ შეიძლება კენჭის აღება.");
      return;
    }

    if (isAiThinking) {
      setNavigatorText("დაელოდე AI მოთამაშეების სვლას. ბაზრიდან აღება შემდეგ შეგიძლია.");
      return;
    }

    markSharedLocalChange();

    const [newTile, ...rest] = marketDeck;

    setMarketDeck(rest);
    if (localSeatId === "human") {
      setHand((previous) => [...previous, newTile]);
    } else {
      setAiHands((previous) => ({
        ...previous,
        [localSeatId]: [...(previous[localSeatId] || []), newTile],
      }));
    }

    setSelectedTileId(newTile.id);
    setLog((previous) => [`${getPlayerName(localSeatId)}-მა ბაზრიდან აიღო კენჭი „${newTile.name}“.`, ...previous]);
    setNavigatorText(`${newTile.name}: ${newTile.description}`);
    playSound("tile");
  }

  function sendChatMessage() {
    const text = chatInput.trim();
    if (!text) return;

    const target = players.find((player) => player.id === privateTarget);

    // Add human message
    setChatMessages((previous) => [
      {
        id: makeId("chat-human"),
        author: playerName,
        text,
        type: "human",
        mode: chatMode,
        to: chatMode === "private" ? target?.name : undefined,
      },
      ...previous,
    ]);

    setChatInput("");
    playSound("chat");

    // Generate AI response after a short delay
    const delayMs = 1500 + Math.random() * 1500; // 1.5-3 seconds

    setTimeout(() => {
      if (chatMode === "private" && target && target.type === "ai") {
        // Private message - responding AI player replies
        const aiReply = generateAiChatReply(target.id, playerName, text, chatMode);

        setChatMessages((previous) => [
          {
            id: makeId("chat-ai"),
            author: target.name,
            text: aiReply,
            type: "ai",
            mode: chatMode,
            to: playerName,
          },
          ...previous,
        ]);
      } else if (chatMode === "public") {
        // Public message - one or more AI players respond
        const respondingAi = aiPlayersBase[Math.floor(Math.random() * aiPlayersBase.length)];
        const aiReply = generateAiChatReply(respondingAi.id, playerName, text, chatMode);

        setChatMessages((previous) => [
          {
            id: makeId("chat-ai"),
            author: respondingAi.name,
            text: aiReply,
            type: "ai",
            mode: chatMode,
          },
          ...previous,
        ]);
      }
    }, delayMs);
  }

  const visibleChatMessages = chatMessages.filter((message) => message.mode === chatMode);
  const spotlightPlayer = moveSpotlight ? getPlayerById(moveSpotlight.actorId) : null;
  const spotlightLook = spotlightPlayer ? getAvatarLook(spotlightPlayer) : null;

  return (
    <main className="roomGamePage">
      <header className="gameTopbar">
        <a className="gameLogo" href="/">
          <span className="gameLogoMark">ს</span>
          <span>სვლები</span>
        </a>

        <div className="gameTopInfo">
          <span>ოთახი: {roomId}</span>
          <span>რეჟიმი: {mode === "group" ? "მეგობრებთან" : "მარტო"}</span>
          <span>მოთამაშე: {playerName}</span>
        </div>

        <button
          className={soundOn ? "soundToggle soundOn" : "soundToggle"}
          onClick={() => setSoundOn((value) => !value)}
          type="button"
        >
          {soundOn ? "🔊 ხმა" : "🔇 ხმა"}
        </button>

        <a className="gameTopButton" href="/setup">
          ახალი თამაში
        </a>
      </header>

      <section className="gameShell v8GameShell">
        <section className="centerGameArea v8CenterArea">
          <div className="playersTopStrip">
            {players.map((player) => {
              const look = getAvatarLook(player);

              return (
                <div className="topPlayerWrap" key={player.id}>
                  <div className={`topPlayerCard ${currentTurnId === player.id ? "currentTurnTopPlayer" : ""}`}>
                    <div
                      className="topPlayerAvatar naturalAvatar"
                      style={{
                        background: look.bg,
                        borderColor: look.ring,
                      }}
                    >
                      {look.emoji}
                    </div>
                    <strong>{mode === "group" && player.id === seatId ? `${player.name} (თქვენ)` : player.name}</strong>
<span>
  {player.id === "human" && humanObserverMode
    ? "დაასრულა"
    : player.tileCount === 0
      ? "დაასრულა"
      : `${player.tileCount} კენჭი`}
</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="tableArea verticalTableArea v8TableArea">
            <div className="boardMarketStack">
              <div className="boardMarketBox">
                <div className="marketBoxLabel">ბაზარი</div>
                <div className="miniMarketStack"></div>
                <strong>{marketDeck.length}</strong>
                <button onClick={drawFromMarket} type="button">
                  აღება
                </button>
              </div>

              <div className="moveSpotlightCard">
                <div className="moveSpotlightTitle">ბოლო მოქმედება</div>

                {moveSpotlight && spotlightLook ? (
                  <>
                    <div
                      className="moveSpotlightAvatar"
                      style={{
                        background: spotlightLook.bg,
                        borderColor: spotlightLook.ring,
                      }}
                    >
                      {spotlightLook.emoji}
                    </div>

                    <div className="moveSpotlightName">{moveSpotlight.actorName}</div>

                    <div className="moveSpotlightAction">
                      <strong>{moveSpotlight.actionLabel}</strong>
                      <span> → {moveSpotlight.targetName}</span>
                    </div>

                    <div className="moveSpotlightBubble">{moveSpotlight.phrase}</div>
                  </>
                ) : (
                  <div className="moveSpotlightEmpty">ჯერ სვლა არ შესრულებულა.</div>
                )}
              </div>
            </div>

            <div
              className="verticalDominoCanvas v8DominoCanvas"
              style={{ "--boardScale": String(boardScale) } as CSSProperties}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();

                const tileId = draggedTileId || event.dataTransfer.getData("text/plain");

                if (!tileId) {
                  setNavigatorText("ჯერ აირჩიეთ ან გადაასრიალეთ კენჭი.");
                  return;
                }

                if (winner) {
                  setNavigatorText("თამაში უკვე დასრულებულია.");
                  setDraggedTileId(null);
                  return;
                }

                if (isAiThinking) {
                  setNavigatorText("ახლა თქვენი სვლა არ არის. დაელოდეთ სხვა მოთამაშეს.");
                  setDraggedTileId(null);
                  return;
                }

                if (board.length === 0) {
                  setNavigatorText("პირველი სვლა მხოლოდ „სვლა“ კენჭით შეიძლება.");
                  setDraggedTileId(null);
                  return;
                }

                const rect = event.currentTarget.getBoundingClientRect();
                const dropX = ((event.clientX - rect.left) / rect.width) * 100;
                const dropY = ((event.clientY - rect.top) / rect.height) * 100;

                let nearest = board[0];
                let nearestDistance = Number.POSITIVE_INFINITY;

                board.forEach((node) => {
                  const dx = dropX - node.x;
                  const dy = dropY - node.y;
                  const distance = Math.sqrt(dx * dx + dy * dy);

                  if (distance < nearestDistance) {
                    nearest = node;
                    nearestDistance = distance;
                  }
                });

                if (!nearest || nearestDistance > 28) {
                  setNavigatorText("კენჭი უნდა მიადოთ უკვე დადებულ კენჭს.");
                  setDraggedTileId(null);
                  return;
                }

                const dx = dropX - nearest.x;
                const dy = dropY - nearest.y;

                const autoSide: AttachSide =
                  Math.abs(dx) >= Math.abs(dy)
                    ? dx >= 0
                      ? "right"
                      : "left"
                    : dy >= 0
                      ? "bottom"
                      : "top";

                const rawPos = getPositionBySide(nearest, autoSide, board.length);

                if (isColliding(rawPos.x, rawPos.y, board)) {
                  setNavigatorText("ეს ადგილი დაკავებულია. აირჩიეთ სხვა მხარე.");
                  setDraggedTileId(null);
                  return;
                }

                setSelectedAnchorId(nearest.id);
                playTileOnAnchor(nearest, tileId, autoSide);
              }}
            >
              <svg className="dominoLinks" aria-hidden="true">
                {board
                  .filter((tile) => tile.parentId)
                  .map((tile) => {
                    const parent = board.find((item) => item.id === tile.parentId);
                    if (!parent) return null;

                    return (
                      <line
                        key={`${parent.id}-${tile.id}`}
                        x1={`${parent.x}%`}
                        y1={`${parent.y}%`}
                        x2={`${tile.x}%`}
                        y2={`${tile.y}%`}
                      />
                    );
                  })}
              </svg>

              {board.map((tile) => (
                <div
                  className={`boardDominoNode ${
                    tile.orientation === "horizontal" ? "placedHorizontal" : "placedVertical"
                  } ${selectedAnchorId === tile.id ? "selectedBoardAnchor" : ""} ${
                    lastPlacedTileId === tile.id ? "lastPlacedTile" : ""
                  }`}
                  key={tile.id}
                  style={{ left: `${tile.x}%`, top: `${tile.y}%` }}
                  onClick={() => {
                    setSelectedAnchorId(tile.id);
                    setNavigatorText(getNavigatorTextForBoardTile(tile));
                  }}
                  onMouseEnter={() => setNavigatorText(getNavigatorTextForBoardTile(tile))}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const tileId = draggedTileId || event.dataTransfer.getData("text/plain");
                    playTileOnAnchor(tile, tileId, selectedSide);
                  }}
                >
                  <div
                    className={`${tileClass(tile.color)} boardPlacedSameTile boardTileSameAsHand ${
                      tile.orientation === "horizontal" ? "tileHorizontal" : "tileVertical"
                    } ${tile.moveType === "start" ? "startPlayedDomino" : ""}`}
                  >
                    <b>{tile.symbol}</b>
                    <span>{tile.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="moveControls v8MoveControls">
            <div>
              <label>მიბმა რომელ მხარეს?</label>
              <div className="sideSelector">
                {[
                  ["left", "მარცხნივ"],
                  ["right", "მარჯვნივ"],
                  ["top", "ზემოთ"],
                  ["bottom", "ქვემოთ"],
                ].map(([side, label]) => (
                  <button
                    key={side}
                    className={selectedSide === side ? "activeMiniButton" : ""}
                    onClick={() => setSelectedSide(side as AttachSide)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label>მიმართულება</label>
              <div className="sideSelector">
                <button
                  className={selectedOrientation === "horizontal" ? "activeMiniButton" : ""}
                  onClick={() => setSelectedOrientation("horizontal")}
                  type="button"
                >
                  ჰორ.
                </button>
                <button
                  className={selectedOrientation === "vertical" ? "activeMiniButton" : ""}
                  onClick={() => setSelectedOrientation("vertical")}
                  type="button"
                >
                  ვერ.
                </button>
              </div>
            </div>

            <div className="dragOnlyHint">
              {mode === "group"
                ? "კენჭი გადაასრიალეთ საერთო დაფაზე."
                : currentTurnId !== localSeatId
                  ? "ახლა სხვა მოთამაშის სვლაა..."
                  : isAiThinking
                    ? "AI მოთამაშის სვლა მზადდება..."
                    : "კენჭი დაიდება მხოლოდ გადათრევით."}
            </div>
          </div>

          <div className="bottomPlayZone v8BottomPlayZone">
            <div className="bottomHandDock compactHandDock">
              <div className="bottomHandHeader">
                <strong>შენი კენჭები</strong>
              </div>

              <div className="bottomVerticalHandTiles compactBottomTiles">
                {currentPlayerHand.map((tile) => (
                  <button
                    className={`${tileClass(tile.color)} ${selectedTileId === tile.id ? "selectedRoomTile" : ""}`}
                    key={tile.id}
                    draggable={
                      !winner &&
                      !humanObserverMode &&
                      (mode === "group"
                        ? currentPlayerHand.length > 0
                        : !isAiThinking && currentTurnId === localSeatId)
                    }
                    onDragStart={(event) => {
                      if (mode !== "group" && isAiThinking) {
                        event.preventDefault();
                        setNavigatorText("დაელოდე AI მოთამაშეების სვლას. შემდეგ ისევ შენი ჯერი დაბრუნდება.");
                        return;
                      }

                      if (mode === "group" && currentPlayerHand.length === 0) {
                        event.preventDefault();
                        setNavigatorText("ამ მოთამაშეს კენჭები აღარ დარჩა.");
                        return;
                      }

                      setDraggedTileId(tile.id);
                      event.dataTransfer.setData("text/plain", tile.id);
                    }}
                    onMouseEnter={() => setNavigatorText(getNavigatorTextForHandTile(tile))}
                    onClick={() => {
                      setSelectedTileId(tile.id);
                      setNavigatorText(getNavigatorTextForHandTile(tile));
                    }}
                    title={tile.description}
                    type="button"
                    disabled={Boolean(winner) || humanObserverMode}
                  >
                    <b>{tile.symbol}</b>
                    <span>{tile.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bottomHelperPanel navigatorPanel">
  <h3>ნავიგატორი — წესები, მნიშვნელობები, რჩევები</h3>
  <p>{navigatorText}</p>

  {humanObserverMode && (
    <div className="observerActions">
      <button
        className="observerActionButton"
        onClick={() => setShowAssessmentModal(true)}
        type="button"
      >
        შეფასების ნახვა
      </button>

      <button
        className="observerActionButton secondary"
        onClick={() => {
          window.location.href = "/";
        }}
        type="button"
      >
        მთავარ გვერდზე დაბრუნება
      </button>
    </div>
  )}
</div>
          </div>
        </section>

        <aside className="rightGamePanel v8RightPanel">
          <div className="panelCard logCard v8LogCard">
            <h2>სვლის ჟურნალი</h2>
            <div className="moveLogList chronologicalLog v8MoveLog">
              {log.map((item, index) => (
                <div
                  className={index === 0 ? "logItem latestLog" : "logItem"}
                  key={`${item}-${index}`}
                >
                  <span>{log.length - index}</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panelCard chatPanelAlways v8ChatPanel">
            <div className="chatPanelHead">
              <h2>ჩატი</h2>
              <div className="chatModeRow">
                <button
                  className={chatMode === "public" ? "chatActive" : ""}
                  onClick={() => setChatMode("public")}
                  type="button"
                >
                  საჯარო
                </button>
                <button
                  className={chatMode === "private" ? "chatActive" : ""}
                  onClick={() => setChatMode("private")}
                  type="button"
                >
                  პირადი
                </button>
              </div>
            </div>

            {chatMode === "private" && (
              <select
                className="privateChatSelect"
                value={privateTarget}
                onChange={(event) => setPrivateTarget(event.target.value)}
              >
                {players
                  .filter((player) => player.type === "ai")
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
              </select>
            )}

            <div className="chatMessages alwaysVisibleChatMessages">
              {visibleChatMessages.map((message) => (
                <p
                  className={message.type === "human" ? "humanChatMessage" : ""}
                  key={message.id}
                >
                  <strong>
                    {message.author}
                    {message.to ? ` → ${message.to}` : ""}:
                  </strong>{" "}
                  {message.text}
                </p>
              ))}
            </div>

            <div className="realChatInput">
              <input
                placeholder={chatMode === "private" ? "პირადი შეტყობინება..." : "საჯარო შეტყობინება..."}
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendChatMessage();
                }}
              />
              <button onClick={sendChatMessage} type="button">
                ➤
              </button>
            </div>
          </div>
        </aside>
      </section>

{/* Victory Modal */}
{showVictoryModal && victoryInfo && (
  <div className="awardModalOverlay" onClick={() => setShowVictoryModal(false)}>
    <div className="awardModalCard" onClick={(event) => event.stopPropagation()}>
      <div className="awardGlow" />

      <div className="awardHeader">
        <div className="awardSeal">
          <div className="awardSealRing">
            <img src="/svlebi-wheel-logo.png" alt="სვლები" className="awardSealLogo" />
          </div>
        </div>

        <div className="awardKicker">
          {victoryInfo.winnerIds.includes("human")
            ? "სტრატეგიული აღიარება"
            : "თამაშის პოლიტიკური შედეგი"}
        </div>

        <h2 className="awardTitle">
          {victoryInfo.winnerIds.includes("human")
            ? "სვლების ორდენი"
            : "პოლიტიკური გამოწვევის ანგარიში"}
        </h2>

        <p className="awardSubtitle">
          {victoryInfo.winnerIds.includes("human")
            ? "თქვენ მოიპოვეთ სტრატეგიული გავლენის ჯილდო"
            : "ამ რაუნდში უპირატესობა სხვა პოლიტიკურ ძალას დარჩა"}
        </p>
      </div>

      <div className="awardRibbon">
        {victoryInfo.winnerIds.includes("human")
          ? "გამარჯვებული სტრატეგი"
          : "შემდეგი სტრატეგიისთვის მზადება"}
      </div>

      <div className="awardInfoGrid">
        <div className="awardInfoBox">
          <span>მოთამაშე</span>
          <strong>{playerName}</strong>
        </div>

        <div className="awardInfoBox">
          <span>სტატუსი</span>
          <strong>
            {victoryInfo.winnerIds.includes("human")
              ? "გამარჯვება"
              : "დამარცხება"}
          </strong>
        </div>

        <div className="awardInfoBox">
          <span>გამარჯვების ტიპი</span>
          <strong>
            {victoryInfo.type === "individual"
              ? "ინდივიდუალური"
              : victoryInfo.type === "alliance"
                ? "ალიანსური"
                : "ლიდერის"}
          </strong>
        </div>

        <div className="awardInfoBox">
          <span>გამარჯვებული</span>
          <strong>{victoryInfo.winners.join(", ")}</strong>
        </div>
      </div>

      <div className="awardReason">
        <div className="awardReasonTitle">საბოლოო პოლიტიკური განმარტება</div>
        <p>{victoryInfo.reason}</p>
      </div>

      <div className="awardMetrics">
        <div>
          <b>გავლენა</b>
          <span>სტრატეგიული პოზიცია</span>
        </div>
        <div>
          <b>ალიანსები</b>
          <span>კავშირების მართვა</span>
        </div>
        <div>
          <b>რისკი</b>
          <span>ტაქტიკური გამბედაობა</span>
        </div>
        <div>
          <b>ლიდერობა</b>
          <span>პროცესის კონტროლი</span>
        </div>
      </div>

      <p className="awardMessage">
        {victoryInfo.winnerIds.includes("human")
          ? "გილოცავთ! ამ თამაშში თქვენმა პოლიტიკურმა არჩევანმა, ტაქტიკურმა სვლებმა და გავლენის მართვამ შედეგი გამოიღო."
          : "ეს შედეგი დამარცხება კი არა, სტრატეგიული გამოცდილებაა. შემდეგ თამაშში შეგიძლიათ უფრო ადრე შექმნათ ალიანსი, გააკონტროლოთ რისკი და უკეთ განსაზღვროთ ლიდერობის მომენტი."}
      </p>

      <div className="awardActions">
        <button
          className="awardPrimaryButton"
          onClick={() => {
            setShowVictoryModal(false);
            if (victoryInfo.winnerIds.includes("human")) {
              setShowAssessmentModal(true);
            }
          }}
          type="button"
        >
          თამაშის შეფასება
        </button>

<button
  className="awardGhostButton"
  onClick={() => {
    continueAiGameAsObserver();
  }}
  type="button"
>
  თამაშში ბოლომდე დარჩენა
</button>
      </div>
    </div>
  </div>
)}

      {/* Assessment Modal */}
      {showAssessmentModal && (
        <div className="modalOverlay v8ModalOverlay" onClick={() => setShowAssessmentModal(false)}>
          <div className="modalContent v8ModalContent v8AssessmentModal" onClick={(e) => e.stopPropagation()}>
            <h2 className="v8ModalTitle">თამაშის შეფასება</h2>

            <div className="v8AssessmentContent">
              <pre className="v8AssessmentText">
                {generatePlayerAssessment(board, hand, playerName)}
              </pre>
            </div>

            <div className="v8ModalButtons">
              <button
                className="v8ModalButton"
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (printWindow) {
                    printWindow.document.write(
                      `<pre style="font-family: Courier, monospace; padding: 20px;">${generatePlayerAssessment(board, hand, playerName).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`
                    );
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
              >
                შეფასების ჩამოწერა
              </button>
              <button
                className="v8ModalButton v8ModalSecondary"
                onClick={() => {
                  setShowAssessmentModal(false);
                  window.location.href = "/";
                }}
              >
                მთავარ გვერდზე დაბრუნება
              </button>
              <button
                className="v8ModalButton v8ModalSecondary"
                onClick={() => {
                  setShowAssessmentModal(false);
                  window.location.href = "/setup";
                }}
              >
                ახალი თამაში
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
