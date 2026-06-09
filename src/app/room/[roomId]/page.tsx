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

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: "chat-1", author: "ნინო AI", text: "ჩატი მზადაა.", type: "ai", mode: "public" },
  ]);

  const [log, setLog] = useState<string[]>([
    "თქვენი ჯერია — აირჩიეთ კენჭი და გადაასრიალეთ მაგიდაზე.",
    "სისტემამ დადო საწყისი კენჭი „სვლა“.",
    "თამაში დაიწყო. ყველა მოთამაშემ მიიღო 6 კენჭი.",
  ]);

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
    if (isAiThinking) return "დაელოდე AI მოთამაშეების სვლას. შემდეგ ისევ შენი ჯერი დაბრუნდება.";

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
    return aiHand.find((tile) => !isFunctionalColor(tile.color) || tile.color !== anchorColor) || aiHand[0];
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

  function playTileOnAnchor(anchor: PlayedTile, forcedTileId?: string) {
    const tileToPlay = hand.find((tile) => tile.id === (forcedTileId || selectedTileId));
    const validationError = validateMove(tileToPlay, anchor);

    if (validationError) {
      setNavigatorText(validationError);
      setDraggedTileId(null);
      return;
    }

    const targetId = chooseTarget(anchor);
    const targetName = getPlayerName(targetId);

    const rawPos = getPositionBySide(anchor, selectedSide, board.length);
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
    setDraggedTileId(null);
    setNavigatorText(`${tileToPlay!.name}: ${tileToPlay!.description}`);
    setSpotlight("human", targetName, tileToPlay!.name, "ვაკეთებ ჩემს სვლას.");

    setLog((previous) => [
      `${playerName}-მა დადო კენჭი „${tileToPlay!.name}“ მოთამაშის მიმართ: ${targetName}.`,
      ...previous,
    ]);

    playSound("tile");

    if (remainingHand.length === 0) {
      setWinner(playerName);
      setLog((previous) => [`თამაში დასრულდა — ${playerName}-მა პირველმა დაცალა კენჭები.`, ...previous]);
      setNavigatorText("გილოცავ! შენ პირველმა დაცალე კენჭები.");
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
    if (marketDeck.length <= 0 || winner) return;

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

    setChatMessages((previous) => [
      {
        id: makeId("chat-human"),
        author: playerName,
        text,
        type: "human",
        mode: chatMode,
        to: chatMode === "private" ? target?.name : undefined,
      },
      {
        id: makeId("chat-ai"),
        author: chatMode === "private" ? target?.name || "AI" : "ნინო AI",
        text: chatMode === "private" ? "პირადი შეტყობინება მივიღე." : "შეტყობინება მივიღე.",
        type: "ai",
        mode: chatMode,
        to: chatMode === "private" ? playerName : undefined,
      },
      ...previous,
    ]);

    setChatInput("");
    playSound("chat");
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
                  } ${selectedAnchorId === tile.id ? "selectedBoardAnchor" : ""}`}
                  key={tile.id}
                  style={{ left: `${tile.x}%`, top: `${tile.y}%` }}
                  onClick={() => {
                    setSelectedAnchorId(tile.id);
                    setNavigatorText(`${tile.name}: ${tile.description}`);
                  }}
                  onMouseEnter={() => setNavigatorText(`${tile.name}: ${tile.description}`)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const tileId = draggedTileId || event.dataTransfer.getData("text/plain");
                    playTileOnAnchor(tile, tileId);
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
                    className={`${tileClass(tile.color)} ${selectedTileId === tile.id ? "selectedRoomTile" : ""}`}
                    key={tile.id}
                    draggable={!winner && !isAiThinking}
                    onDragStart={(event) => {
                      if (isAiThinking) {
                        event.preventDefault();
                        setNavigatorText("დაელოდე AI მოთამაშეების სვლას. შემდეგ ისევ შენი ჯერი დაბრუნდება.");
                        return;
                      }

                      setDraggedTileId(tile.id);
                      event.dataTransfer.setData("text/plain", tile.id);
                    }}
                    onMouseEnter={() => setNavigatorText(`${tile.name}: ${tile.description}`)}
                    onClick={() => {
                      setSelectedTileId(tile.id);
                      setNavigatorText(`${tile.name}: ${tile.description}`);
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
    </main>
  );
}
