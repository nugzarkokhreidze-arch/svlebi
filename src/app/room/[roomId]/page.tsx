"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

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

  // AI personality-based responses
  const replies: Record<string, Record<ChatIntent, string[]>> = {
    diplomat: {
      agreement: ["კარგი, ამ ეტაპზე შემიძლია დაგეთანხმო.", "შეთანხმება მისაღებია, მაგრამ ვნახოთ რა ფასი ექნება.", "ეთანხმები, დააკვირდი ჩემს შემდეგ სვლას."],
      refusal: ["ამაზე ვერ დაგთანხმდები.", "ჯერ არა. შენი პოზიცია საკმარისად დამაჯერებელი არ არის.", "დღეს რა ვთქვა, ხვალ შეიძლება იცვლებოდეს."],
      joke: ["ჰმ, რა თქმა უნდა.", "უმორო მოთამაშე ხარ.", "კარგი, ვცდი შენი იუმორი."],
      challenge: ["აბა, ახლა ვნახოთ რა გაქვს.", "ეს კარგი რეაქცია იქნება.", "თანამედროვე სვლა გაქ."],
      negotiation: ["შეგვიძლია მოვილაპარაკოთ, მაგრამ პირობები უნდა შეიცვალოს.", "თუ პირობებს დაზუსტებ, შეიძლება შეთანხმებაც შედგეს.", "რა პირობებზე ფიქრობ?"],
      question: ["კარგი კითხვა.", "სიმართლე, სიმართლე.", "ეს დამოკიდებული მოთამაშის სვლაზეა."],
      alliance: ["პოლიტიკური ალიანსი საინტერესოა.", "ერთად ვიქნებოდით უფრო ძლიერი.", "ამის შესახებ გაფიქრდები."],
      threat: ["არ მე არ შიგეშინდი.", "დაკაა თქვენი სვლა.", "ხომ ხელი არ გაუშე?"],
      neutral: ["ჯერ ვხედავ.", "მოდი, ვითამაშოთ.", "სიტუაცია იცვლება."],
    },
    aggressive: {
      agreement: ["კარგი, დაგთანხმდი, მაგრამ ადვილი არ იქნება.", "გეთანხმები, თუმცა მოემზადე."],
      refusal: ["წავიდე, ეს დიდი სიცრუეა.", "ამაზე აბსოლუტურად ვერ!", "შენი ყალბი პროპოზიცია წავეთ."],
      joke: ["სასაცილო, მაგრამ გამხდელი ხარ.", "ეს დაპალეს ხარ."],
      challenge: ["აბა, ახლა ვნახოთ როგორ უპასუხებ.", "შენგან უფრო მკაცრ სვლას ველოდი.", "აქ კი სამართლო ხარ."],
      negotiation: ["ფასი ძალიან მაღალი.", "უფრო კომპრომისი უნდა.", "ეს გარიგება ცხელი არ არის."],
      question: ["რატომ გჯერა, რომ ეს მნიშვნელოვანია?", "უფრო აზრი რაც მაინტერესებს.", "კითხვა ნორმალური კითხვაა."],
      alliance: ["ალიანსი? პირდაპირი არ უნდა.", "მე დამოუკიდებელი მოთამაშე ვარ."],
      threat: ["არ შემეშინდა.", "ხელი კიდევ დაგიტყებ.", "შენი მუქი სიტყვები დამახსენა არაფერი."],
      neutral: ["უაზროდ ლაპარაკი.", "რა ძველი ხიბლი.", "დაე დაიწყოს რეალური თამაში."],
    },
    resource: {
      agreement: ["კარგი, მაშინ რა პირობებზე ვერთხევთ?", "დაგთანხმდი, თუ რესურსი დაერთვება.", "ფასი კარგი, თუ მეტი ღირს."],
      refusal: ["ფასი არ თხეულობს.", "რესურსი ზღვარში არის.", "მეტი რესურსი დამე დაე დაიწყოთ."],
      joke: ["სასაცილო, მაგრამ ფასი აქვს.", "ჰაი მე მხოლოდ რეალური თამაში აღარ ვხვდი."],
      challenge: ["აბა, ვნახოთ რა ღირი შენი თამაში.", "თავაზი სამაგიერო ფასი მოითხოვს.", "თუ ეს სვლა ღირი ხო, მე უფრო კარგი სვლა მაქვს."],
      negotiation: ["რესურსის გაცვლა აუცილებელი იქნებ.", "თუ თანხა დაამატებ, ეთანხმები.", "რა რეალური ღირებულება აქვს შენი წინადადებას?"],
      question: ["რა ღირი შენი კითხვის პასუხი?", "პასუხი მხოლოდ რესურსით შეიძლება.", "კითხვა კარგი, მაგრამ ფასი აქვს."],
      alliance: ["ალიანსი, თუ რესურსი გაიზიარებთ.", "ერთად ვიქნებოდით, თუ მოგება იქნება."],
      threat: ["შენი დაკვრა ბაზარია, მე რეალური რეალობა ცნობ.", "დაკვრა არაფერი ღირს რეალური რესურსის გარეშე.", "თავი უთავო, ფასი გაკეთებ."],
      neutral: ["რა დღე ხა, რა ფასი ხა.", "ყველა რესურსი ღირს.", "ბაზარი საუკეთესო წესიერი."],
    },
    opportunist: {
      agreement: ["კარგი, ეს ხელი მე აქვს.", "გეთანხმები, ეს წინ უნდა დაგაძ."],
      refusal: ["არა, ამაზე დაპატივებული ვარ.", "მე უფრო უკეთესი წინილი გამოკვეთეთ."],
      joke: ["სასაცილო კი, მაგრამ შენი მხარე სუსტი.", "ჰა, თუ ეს დაფუძნებული იყო..."],
      challenge: ["აბა, ვნახოთ კიდეც რომელი მხარე უფრო ძლიერი.", "შენ მხარე სუსტი, ჩემი უფრო მკაცრი.", "აზრი ხე მედე კარგი."],
      negotiation: ["მე უფრო ძლიერი მხარე დავაკითხე.", "თუ გამარჯვებული მხარე ავირჩე, ეთანხმები.", "თუ დასტურს გავაკე, ხელი კი ამოუშვები."],
      question: ["კითხვა კარგი, მაგრამ ჩემი მხარე უფრო დაკმაყოფილებელი.", "რა ჯერ უნდა აირჩი? უფრო ძლიერი."],
      alliance: ["ალიანსი, თუ აბსოლუტურად გამარჯვებული მხარე აირჩი.", "ერთად, თუ მე ვმეთობებ."],
      threat: ["შენი დაკვრა აბას ვერ აკავებს მე.", "დაკვრა დაკვრა, თუმცა მე უფრო კარგი კარტი ავს."],
      neutral: ["ვთხოვ ასპე, ხელი აკითხე.", "მე ჩემი ხელი კი ასწორებ.", "რა დღე, მე კიდეც უფრო კარგი კარტი მაქვს"],
    },
    leader: {
      agreement: ["კარგი, ეს მოთამაშე გავაკე.", "გეთანხმები, ეს სტრატეგიული."],
      refusal: ["ამაზე არა. ლიდერობა ჯერ კიდე დაუთავარებელი.", "ამ საფეხურზე აბა ამ სვლას."],
      joke: ["სასაცილო, მაგრამ გამომაკოთხო კი.", "რა ხუმრობა, ჯერ ლიდერობა მე.", "თუმცა კიდეც ბეჰემდე დაიდე ჩემი ხელი ზე დაგვეხეთ."],
      challenge: ["აბა, ვნახოთ გეემთხვევა ლიდერის პოზიცია.", "შენი სვლა რა კარგი, თუმცა ლიდერობა სხვა საქმეა.", "ეს ლიდერული სვლა კი, მაგრამ ბოლოს ჩემი გამარჯვება."],
      negotiation: ["ლიდერობას სტრატეგიული პირობა სჭირდება.", "თუ მე ლიდერი ხოდი, მოდი ერთად.", "სტრატეგია სტრატეგია, მე დირექტივა ვაძლევ."],
      question: ["ეს კარგი კითხვა, მაგრამ ლიდერი ვიცი პასუხი.", "თუ ლიდერი ხო, გეტყვი პასუხი.", "კითხვა კარგი, თუმცა სხვა ხედვა უნდა."],
      alliance: ["ალიანსი, თუ ლიდერობის კოალიციაში შედი.", "ერთად, მაგრამ ლიდერობა ჩემი."],
      threat: ["შენი დაკვრა სულ რა, ჩემი ლიდერობა.", "დაკვრა აბა, მე ლიდერი ხო.", "ხელი შენი თუ კი, ლიდერობა ჩემი დარჩება."],
      neutral: ["ლიდერობა სტრატეგია.", "ჯერ დავფიქრდები თუ რა მხარე უფრო ლიდერული.", "სტრატეგიული კი, მაგრამ სხვა დათვლა აკ."],
    },
  };

  const aiReplies = replies[behavior] || replies.diplomat;
  const intentReplies = aiReplies[intent] || aiReplies.neutral;
  return intentReplies[Math.floor(Math.random() * intentReplies.length)];
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
  const redTiles = board.filter((t) => t.color === "red" && t.playedById === "human").length;
  const blackTiles = board.filter((t) => t.color === "black" && t.playedById === "human").length;
  const yellowTiles = board.filter((t) => t.color === "yellow" && t.playedById === "human").length;
  const totalMoves = redTiles + blackTiles + yellowTiles;

  const allianceMoves = board.filter(
    (t) =>
      t.playedById === "human" &&
      ["agreement", "partnership", "loyalty", "alliance", "friendship", "consensus"].includes(t.baseId)
  ).length;

  const aggressiveMoves = board.filter(
    (t) =>
      t.playedById === "human" &&
      ["surveillance", "manipulation", "falsification", "bribery", "attack", "neutralize"].includes(t.baseId)
  ).length;

  const assessment = `თამაშის შეფასება — ${humanName}

** საერთო შეფასება **
თქვენი თამაში გამოჩნდა ${totalMoves} მნიშვნელოვანი ნაბიჯით. ${
    redTiles > blackTiles ? "დიპლომატიური მიდგომა" : "უფრო აგრესიული სტილი"
  } აღმოჩნდა. სულ ხელში დაგრჩა ${hand.length} კენჭი.

** სტრატეგიული ხედვა **
კრიტიკული მომენტებში ${totalMoves > 8 ? "აქტიური" : "დაფიქრებული"} ხართ ხელი.
წითელი კენჭების გამოყენება (${redTiles}): სამშვიდობო პოლიტიკა.
შავი კენჭების გამოყენება (${blackTiles}): ${blackTiles > 3 ? "მკაცრი დაკვრა" : "ნელი მიდგომა"}.
ყვითალი კენჭების გამოყენება (${yellowTiles}): რესურსული მნიშვნელობა.

** პოლიტიკური ეთიკა და წესიერება **
ალიანსის მცდელობა: ${allianceMoves > 2 ? "კარგი თანამშრომლობის ბაზა" : "უფრო დამოუკიდებელი თამაში"}.
აგრესიული მოქმედება: ${aggressiveMoves > 3 ? "აქტიური პოლიტიკა" : "სამშვიდობო პოზიცია"}.

** მოლაპარაკების უნარი **
რესურსი და შეთანხმებები: ${yellowTiles > 2 ? "ხელშემკჭობილი" : "საჭიროა განვითარება"}.
პირობების წაყენება: ${totalMoves > 5 ? "თამაში აცნობიერებული" : "უფრო რეაქტიული მოთამაშე"}.

** რისკი და ავანტიურა **
ბანკის რისკი: ${aggressiveMoves > totalMoves / 2 ? "მაღალი რისკი" : "სწრთე მიდგომა"}.
ახალი სტრატეგია: ${totalMoves < 5 ? "საჭიროა მეტი ნაბიჯი" : "მკაფიოდ განვითარებული პლან"}.

** ალიანსები და ურთიერთობები **
გაკე პარტნიორი მოთამაშე: ${allianceMoves > 0 ? "კარგი თანამშრომლობა" : "მოკაა მონაწილეობა"}.
ურთიერთობების მანიპულირება: ${aggressiveMoves > 5 ? "აქტიური საწინააღმდეგო მოქმედება" : "კოორდინაციული სტილი"}.

** რესურსების გამოყენება **
ფიქსირებული რესურსი: ${yellowTiles > 0 ? "მიზანმიმართული ხარჯი" : "გამოუყენებელი კაპიტალი"}.

** გაუმჯობესების რჩევები **
1. მეტი ყურადღება მიაქციეთ ალიანსების დროულ შექმნას - ეს გახდება ხელი.
2. არ გამოიყენოთ აგრესიული კენჭები ზედმეტად ადრე - დაეკვიდრეთ ფიქსირებული პოზიცია.
3. რესურსული კენჭები გამოიყენეთ მაშინ, როცა მოლაპარაკებას ფასი სჭირდება.
4. სცადეთ სხვადასხვა მოთამაშესთან ბალანსირებული ურთიერთობა.
5. ლიდერობისკენ სვლა დაგეგმეთ არა ერთჯერადი, არამედ რამდენიმე ნაბიჯიანი სტრატეგიით.`;

  return assessment;
}

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const roomId = String(params.roomId || "ROOM");
  const mode = searchParams.get("mode") || "solo";
  const playerName = searchParams.get("name") || "მოთამაშე";
  const avatarId = searchParams.get("avatar") || "strategist";

  const [setup] = useState(() => createGameSetup(roomId));
  const [hand, setHand] = useState<GameTile[]>(setup.humanHand);
  const [marketDeck, setMarketDeck] = useState<GameTile[]>(setup.market);
  const [aiHands, setAiHands] = useState<Record<string, GameTile[]>>(setup.aiHands);

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
  const [turnCounter, setTurnCounter] = useState(0);

  // Drag/drop state
  const [dragState, setDragState] = useState<{
    tileId: string;
    tile: GameTile;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
  } | null>(null);
  const [dragCanvasRect, setDragCanvasRect] = useState<DOMRect | null>(null);
  const [dragNearestAnchor, setDragNearestAnchor] = useState<PlayedTile | null>(null);
  const [dragCalculatedSide, setDragCalculatedSide] = useState<AttachSide | null>(null);

  const players: Player[] = useMemo(
    () => [
      {
        id: "human",
        name: playerName,
        avatar: avatarMap[avatarId] || "🧑🏻‍💼",
        type: "human",
        tileCount: hand.length,
      },
      ...aiPlayersBase.map((player) => ({
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        type: "ai" as const,
        tileCount: aiHands[player.id]?.length || 0,
      })),
    ],
    [aiHands, avatarId, hand.length, playerName]
  );

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
    if (anchor.playedById !== "human" && anchor.playedById !== "system") {
      return anchor.playedById;
    }

    const index = board.length % aiPlayersBase.length;
    return aiPlayersBase[index].id;
  }

  function validateMove(tile: GameTile | undefined, anchor: PlayedTile) {
    if (!tile) return "ჯერ უნდა აირჩიო კენჭი.";
    if (winner) return "თამაში უკვე დასრულებულია.";
    if (currentTurnId !== "human") {
      return "ეს არ არის თქვენი ჯერი. დაელოდე AI მოთამაშეების სვლას.";
    }
    if (isAiThinking) return "დაელოდე AI მოთამაშეების სვლას. შემდეგ ისევ შენი ჯერი დაბრუნდება.";
    if (!anchor) return "აირჩიეთ ადგილი დაფაზე რომელზეც კენჭი დაიდება.";
    if (board.length === 1 && tile.baseId !== "start-green") {
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
      (player) => player.id !== excludeId && (hands[player.id]?.length || 0) > 0
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

  // Helper: Find nearest board tile to a screen position
  function findNearestBoardTileAtPosition(screenX: number, screenY: number): PlayedTile | null {
    if (!dragCanvasRect) return null;

    const canvasRelX = screenX - dragCanvasRect.left;
    const canvasRelY = screenY - dragCanvasRect.top;
    const percentX = (canvasRelX / dragCanvasRect.width) * 100;
    const percentY = (canvasRelY / dragCanvasRect.height) * 100;

    let nearest: PlayedTile | null = null;
    let minDistance = 20; // within 20% of canvas

    board.forEach((tile) => {
      const dist = Math.sqrt(Math.pow(tile.x - percentX, 2) + Math.pow(tile.y - percentY, 2));
      if (dist < minDistance) {
        minDistance = dist;
        nearest = tile;
      }
    });

    return nearest;
  }

  // Helper: Calculate which side to attach based on cursor position relative to anchor
  function calculateAttachSide(anchor: PlayedTile, screenX: number, screenY: number): AttachSide {
    if (!dragCanvasRect) return "bottom";

    const canvasRelX = screenX - dragCanvasRect.left;
    const canvasRelY = screenY - dragCanvasRect.top;
    const percentX = (canvasRelX / dragCanvasRect.width) * 100;
    const percentY = (canvasRelY / dragCanvasRect.height) * 100;

    const dx = percentX - anchor.x;
    const dy = percentY - anchor.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy) {
      return dx > 0 ? "right" : "left";
    } else {
      return dy > 0 ? "bottom" : "top";
    }
  }

  function playTileOnAnchor(anchor: PlayedTile, forcedTileId?: string, dragCalculatedSide?: AttachSide) {
    const tileToPlay = hand.find((tile) => tile.id === (forcedTileId || selectedTileId));
    const validationError = validateMove(tileToPlay, anchor);

    if (validationError) {
      setNavigatorText(validationError);
      setDraggedTileId(null);
      return;
    }

    const targetId = chooseTarget(anchor);
    const targetName = getPlayerName(targetId);

    // Use drag-calculated side if provided, otherwise use manual selection
    const sideToUse = dragCalculatedSide || selectedSide;
    const rawPos = getPositionBySide(anchor, sideToUse, board.length);
    const safePos = findSafePosition(rawPos.x, rawPos.y, board);

    const humanPlayedTile: PlayedTile = {
      ...tileToPlay!,
      id: makeId(`${tileToPlay!.baseId}-human`),
      playedBy: playerName,
      playedById: "human",
      targetName,
      targetId,
      moveType: "human",
      parentId: anchor.id,
      x: safePos.x,
      y: safePos.y,
      orientation: selectedOrientation,
    };

    const remainingHand = hand.filter((tile) => tile.id !== tileToPlay!.id);
    const boardAfterHuman = [...board, humanPlayedTile];

    setIsAiThinking(true);
    setCurrentTurnId(targetId);
    setHand(remainingHand);
    setSelectedTileId(remainingHand[0]?.id || "");
    setSelectedAnchorId(humanPlayedTile.id);
    setBoard(boardAfterHuman);
    setLastPlacedTileId(humanPlayedTile.id);
    setLastMoveTimestamp(Date.now());
    setDraggedTileId(null);
    setNavigatorText(`${tileToPlay!.name}: ${tileToPlay!.description}`);
    setSpotlight("human", targetName, tileToPlay!.name, "ვაკეთებ ჩემს სვლას.");

    setLog((previous) => [
      `${playerName}-მა დადო კენჭი „${tileToPlay!.name}“ მოთამაშის მიმართ: ${targetName}.`,
      ...previous,
    ]);

    playSound("tile");

    // Track leader (L tiles)
    if (tileToPlay!.symbol === "L") {
      setLeaderId("human");
      setLeaderSinceTurn(board.length);
    }

    if (remainingHand.length === 0) {
      setWinner(playerName);
      setLog((previous) => [`თამაში დასრულდა — ${playerName}-მა პირველმა დაცალა კენჭები.`, ...previous]);
      setNavigatorText("გილოცავ! შენ პირველმა დაცალე კენჭები.");
      setVictoryInfo({
        type: "individual",
        winners: [playerName],
        winnerIds: ["human"],
        reason: `${playerName} პირველმა დაცალა ყველა კენჭი.`,
      });
      setGameEnded(true);
      setShowVictoryModal(true);
      setIsAiThinking(false);
      setCurrentTurnId("human");
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
          oppositeSide(selectedSide)
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
        setCurrentTurnId("human");
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
          setCurrentTurnId("human");
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
          setCurrentTurnId("human");
          setIsAiThinking(false);
        }, 1200);
      }, AI_MOVE_DELAY);
    }, AI_MOVE_DELAY);
  }

  function drawFromMarket() {
    if (winner) return;

    if (marketDeck.length <= 0) {
      setNavigatorText("ბაზარი ცარიელია. აღარ შეიძლება კენჭის აღება.");
      return;
    }

    if (isAiThinking) {
      setNavigatorText("დაელოდე AI მოთამაშეების სვლას. ბაზრიდან აღება შემდეგ შეგიძლია.");
      return;
    }

    const [newTile, ...rest] = marketDeck;

    setMarketDeck(rest);
    setHand((previous) => [...previous, newTile]);
    setSelectedTileId(newTile.id);
    setLog((previous) => [`${playerName}-მა ბაზრიდან აიღო კენჭი „${newTile.name}“.`, ...previous]);
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
                    <strong>{player.name}</strong>
                    <span>{player.tileCount} კენჭი</span>
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
                  } ${dragNearestAnchor?.id === tile.id ? "dragOverAnchorTile" : ""}`}
                  key={tile.id}
                  style={{ left: `${tile.x}%`, top: `${tile.y}%` }}
                  onClick={() => {
                    setSelectedAnchorId(tile.id);
                    setNavigatorText(getNavigatorTextForBoardTile(tile));
                  }}
                  onMouseEnter={() => setNavigatorText(getNavigatorTextForBoardTile(tile))}
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
              {isAiThinking ? "AI მოთამაშის სვლა მზადდება..." : "კენჭი დაიდება მხოლოდ გადათრევით."}
            </div>
          </div>

          <div className="bottomPlayZone v8BottomPlayZone">
            <div className="bottomHandDock compactHandDock">
              <div className="bottomHandHeader">
                <strong>შენი კენჭები</strong>
              </div>

              <div className="bottomVerticalHandTiles compactBottomTiles">
                {hand.map((tile) => (
                  <button
                    className={`${tileClass(tile.color)} ${selectedTileId === tile.id ? "selectedRoomTile" : ""} ${dragState?.tileId === tile.id ? "draggingHandTile" : ""}`}
                    key={tile.id}
                    onPointerDown={(event) => {
                      if (winner || isAiThinking || currentTurnId !== "human") return;
                      event.preventDefault();

                      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                      const canvasElement = document.querySelector(".verticalDominoCanvas");
                      const canvasRect = canvasElement?.getBoundingClientRect();

                      setDragState({
                        tileId: tile.id,
                        tile,
                        startX: event.clientX,
                        startY: event.clientY,
                        currentX: event.clientX,
                        currentY: event.clientY,
                        isDragging: false, // Will be set to true on first move
                      });

                      if (canvasRect) {
                        setDragCanvasRect(canvasRect);
                      }

                      setSelectedTileId(tile.id);
                      setNavigatorText(getNavigatorTextForHandTile(tile));
                      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      if (!dragState || dragState.tileId !== tile.id) return;

                      const moveDistance = Math.sqrt(
                        Math.pow(event.clientX - dragState.startX, 2) +
                          Math.pow(event.clientY - dragState.startY, 2)
                      );

                      if (moveDistance > 8) {
                        // Mark as actually dragging after 8px movement
                        setDragState((prev) =>
                          prev
                            ? {
                                ...prev,
                                isDragging: true,
                                currentX: event.clientX,
                                currentY: event.clientY,
                              }
                            : null
                        );

                        // Find nearest anchor and calculate side
                        const nearest = findNearestBoardTileAtPosition(event.clientX, event.clientY);
                        if (nearest) {
                          const side = calculateAttachSide(nearest, event.clientX, event.clientY);
                          setDragNearestAnchor(nearest);
                          setDragCalculatedSide(side);
                        } else {
                          setDragNearestAnchor(null);
                          setDragCalculatedSide(null);
                        }

                        // Prevent page scroll while dragging
                        document.body.style.overflow = "hidden";
                      } else {
                        // Still within click threshold, update position only
                        setDragState((prev) =>
                          prev
                            ? {
                                ...prev,
                                currentX: event.clientX,
                                currentY: event.clientY,
                              }
                            : null
                        );
                      }
                    }}
                    onPointerUp={(event) => {
                      if (!dragState || dragState.tileId !== tile.id) return;

                      document.body.style.overflow = "auto";
                      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);

                      if (dragState.isDragging && dragNearestAnchor && dragCalculatedSide) {
                        // Validate special first move rule
                        const tileToPlay = hand.find((t) => t.id === tile.id);

                        if (board.length === 1 && dragNearestAnchor.moveType === "start") {
                          // First move - must be "სვლა"
                          if (tileToPlay?.baseId !== "start-green") {
                            setNavigatorText("პირველი სვლა მხოლოდ \'სვლა\' კენჭით შეიძლება.");
                            setDragState(null);
                            setDragNearestAnchor(null);
                            setDragCalculatedSide(null);
                            return;
                          }
                        }

                        // Check if anchor is the start tile and it's occupied on that side
                        if (dragNearestAnchor.moveType === "start") {
                          const existingOnSide = board.some(
                            (t) =>
                              t.parentId === dragNearestAnchor.id &&
                              t.id !== dragState.tileId &&
                              t.orientation === (dragCalculatedSide === "left" || dragCalculatedSide === "right" ? "horizontal" : "vertical")
                          );

                          if (existingOnSide) {
                            setNavigatorText("ეს ადგილი დაკავებულია. აირჩიეთ სხვა მხარე.");
                            setDragState(null);
                            setDragNearestAnchor(null);
                            setDragCalculatedSide(null);
                            return;
                          }
                        }

                        // Attempt to place the tile with drag-calculated side
                        playTileOnAnchor(dragNearestAnchor, tile.id, dragCalculatedSide);
                      } else if (dragState.isDragging && !dragNearestAnchor) {
                        setNavigatorText("კენჭი უნდა მიადოთ უკვე დადებულ კენჭს.");
                      }

                      // Clean up drag state
                      setDragState(null);
                      setDragNearestAnchor(null);
                      setDragCalculatedSide(null);
                    }}
                    onMouseEnter={() => {
                      if (!dragState?.isDragging) {
                        setNavigatorText(getNavigatorTextForHandTile(tile));
                      }
                    }}
                    onClick={(event) => {
                      if (dragState?.isDragging) {
                        event.preventDefault();
                        return;
                      }
                      setSelectedTileId(tile.id);
                      setNavigatorText(getNavigatorTextForHandTile(tile));
                    }}
                    title={tile.description}
                    type="button"
                    disabled={Boolean(winner)}
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

      {/* Drag Preview Overlay */}
      {dragState?.isDragging && (
        <div
          className="dragPreviewOverlay"
          style={{
            left: `${dragState.currentX}px`,
            top: `${dragState.currentY}px`,
          }}
        >
          <div className={`${tileClass(dragState.tile.color)} dragPreviewTile`}>
            <b>{dragState.tile.symbol}</b>
            <span>{dragState.tile.name}</span>
          </div>
          {dragNearestAnchor && dragCalculatedSide && (
            <div className="dragHintText">
              {dragCalculatedSide === "right" && "მარჯვნივ"}
              {dragCalculatedSide === "left" && "მარცხნივ"}
              {dragCalculatedSide === "top" && "ზემოთ"}
              {dragCalculatedSide === "bottom" && "ქვემოთ"}
            </div>
          )}
        </div>
      )}

      {/* Victory Modal */}
      {showVictoryModal && victoryInfo && (
        <div className="modalOverlay v8ModalOverlay" onClick={() => setShowVictoryModal(false)}>
          <div className="modalContent v8ModalContent" onClick={(e) => e.stopPropagation()}>
            <h2 className="v8ModalTitle">
              {victoryInfo.winnerIds.includes("human") ? "თქვენ გაიმარჯვეთ!" : "ამ ეტაპზე თქვენ დამარცხდით"}
            </h2>

            <div className="v8ModalBody">
              <p className="v8ModalWinnerType">
                გამარჯვების ტიპი: {victoryInfo.type === "individual" ? "ინდივიდუალური" : victoryInfo.type === "alliance" ? "ალიანსი" : "ლიდერი"}
              </p>

              <p className="v8ModalWinners">
                გამარჯვებული: {victoryInfo.winners.join(", ")}
              </p>

              <p className="v8ModalReason">{victoryInfo.reason}</p>

              {victoryInfo.winnerIds.includes("human") ? (
                <p className="v8ModalMessage">გილოცავთ! თქვენმა სტრატეგიამ ამ ეტაპზე იმუშავა.</p>
              ) : (
                <p className="v8ModalMessage">თუმცა უკვე გამოცდილება მიიღეთ და შემდეგ თამაშში უკეთეს სტრატეგიას ააწყობთ.</p>
              )}
            </div>

            <div className="v8ModalButtons">
              <button
                className="v8ModalButton"
                onClick={() => {
                  setShowVictoryModal(false);
                  if (victoryInfo.winnerIds.includes("human")) {
                    setShowAssessmentModal(true);
                  }
                }}
              >
                თამაშის შეფასება
              </button>
              <button
                className="v8ModalButton v8ModalSecondary"
                onClick={() => {
                  setShowVictoryModal(false);
                  setGameEnded(false);
                }}
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
