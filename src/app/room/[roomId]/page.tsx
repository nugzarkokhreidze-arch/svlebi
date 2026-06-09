"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type PlayerType = "human" | "ai";
type TileColor = "red" | "black" | "yellow" | "green";
type TileKind = "proposal" | "pressure" | "money" | "special" | "start";
type Orientation = "vertical" | "horizontal";
type AttachSide = "right" | "left" | "top" | "bottom";
type ChatMode = "public" | "private";

type Player = {
  id: string;
  name: string;
  avatar: string;
  type: PlayerType;
};

type Tile = {
  id: string;
  name: string;
  symbol: string;
  color: TileColor;
  kind: TileKind;
  countLabel: string;
  meaning: string;
  effect?: "reveal" | "draw1" | "draw2" | "draw3" | "reverse" | "leader" | "refresh" | "skip" | "double" | "minus";
};

type BoardTile = {
  id: string;
  tile: Tile;
  playerId: string;
  targetId: string;
  x: number;
  y: number;
  orientation: Orientation;
  turn: number;
  phrase: string;
};

type JournalEntry = {
  id: string;
  turn: number;
  text: string;
  tone?: "normal" | "warning" | "good";
};

type ChatMessage = {
  id: string;
  fromId: string;
  toId?: string;
  mode: ChatMode;
  text: string;
  time: string;
};

type LastMove = {
  playerId: string;
  targetId: string;
  tileName: string;
  phrase: string;
};

type GameState = {
  players: Player[];
  hands: Record<string, Tile[]>;
  market: Tile[];
  board: BoardTile[];
  currentPlayerId: string;
  direction: 1 | -1;
  turn: number;
  leaderId?: string;
  selectedTileId?: string;
  selectedBoardId?: string;
  targetPlayerId: string;
  attachSide: AttachSide;
  orientation: Orientation;
  navigator: string;
  journal: JournalEntry[];
  chat: ChatMessage[];
  chatMode: ChatMode;
  privateTargetId: string;
  chatDraft: string;
  soundOn: boolean;
  skipTurns: Record<string, number>;
  revealedPlayerId?: string;
  lastMove?: LastMove;
  gameOver?: {
    title: string;
    description: string;
    winnerIds: string[];
  };
};

const PLAYER_AVATARS = ["👨🏻‍💼", "👩🏻‍💼", "🧔🏻‍♂️", "👱🏻‍♀️", "👨🏽‍💼", "🧑🏽‍💻"];
const AI_NAMES = ["ნინო AI", "გიორგი AI", "მარიამ AI", "ლევანი AI", "დავით AI"];

const AI_PHRASES = [
  "აბა, ამას როგორ უპასუხებ?",
  "ეს კომბინაცია მომწონს.",
  "შენგან ამას არ ველოდი.",
  "ახლა ძალთა ბალანსი იცვლება.",
  "საინტერესო სვლა იქნება.",
  "მე რისკზე მივდივარ.",
  "ვნახოთ, ვის დაუდგები გვერდით.",
  "ეს პოლიტიკური ტესტია.",
  "ახლა მოლაპარაკება იწყება.",
  "ამას მარტივად ვერ გაატარებ.",
  "შეთანხმებასაც ფასი აქვს.",
  "მე სხვა გზას ვირჩევ.",
];

const HUMAN_PHRASES = [
  "ვიწყებ ჩემს სვლას.",
  "ეს ჩემი პოზიციაა.",
  "ვნახოთ, რას მიპასუხებთ.",
  "ამ სვლას თავისი ფასი აქვს.",
];

const STAGE_W = 900;
const STAGE_H = 390;
const CARD_STEP_X = 94;
const CARD_STEP_Y = 126;

function makeTile(base: Omit<Tile, "id">, index: number): Tile {
  return {
    ...base,
    id: `${base.color}-${base.kind}-${base.name}-${base.symbol}-${index}`,
  };
}

function buildDeck(): Tile[] {
  let index = 1;
  const deck: Tile[] = [];

  const add = (base: Omit<Tile, "id">) => {
    deck.push(makeTile(base, index));
    index += 1;
  };

  [
    ["შეთანხმება", "🤝", "საერთო პირობების მიღწევა და პოზიციების დაახლოება."],
    ["პარტნიორობა", "🤝", "გრძელვადიანი თანამშრომლობის შეთავაზება."],
    ["ლოიალობა", "🛡", "მხარდაჭერის, ერთგულებისა და ნდობის გამოხატვა."],
    ["ალიანსი", "+", "მოთამაშეებს შორის ძალების გაერთიანება საერთო მიზნისთვის."],
    ["მეგობრობა", "☀", "კეთილგანწყობის და რბილი პოლიტიკური კავშირის სვლა."],
    ["ცვლილება", "↺", "სტრატეგიის, მიმართულების ან პოლიტიკური პოზიციის შეცვლა."],
    ["გასაიდუმლოება", "☷", "დახურული შეთანხმება ან ინფორმაციის დროებით დაფარვა."],
    ["ნეიტრალობა", "0", "პოზიციის დროებით არ დაფიქსირება ან კონფლიქტისგან დისტანცირება."],
    ["კონსენსუსი", "◎", "ყველასთვის მისაღები გადაწყვეტილების ძიება."],
    ["გარიგება", "♦", "ინტერესების გაცვლა შეთანხმების მისაღწევად."],
    ["დანათესავება", "∞", "კავშირის გამყარება პირადი, ჯგუფური ან სტრატეგიული სიახლოვით."],
    ["მხილება", "!", "მიმღები მოთამაშე დროებით აჩვენებს თავის კენჭებს."],
    ["დიალოგი", "💬", "მოლაპარაკების, ახსნის ან ახალი ურთიერთობის გახსნა."],
  ].forEach(([name, symbol, meaning]) =>
    add({
      name,
      symbol,
      color: "red",
      kind: "proposal",
      countLabel: "1",
      meaning,
      effect: name === "მხილება" ? "reveal" : undefined,
    })
  );

  [
    ["თვალთვალი", "👁", "ინფორმაციის ფარული შეგროვება სხვა მოთამაშის ქცევის გასაგებად."],
    ["მანიპულაცია", "M", "სხვის გადაწყვეტილებაზე ირიბი გავლენის მოხდენა."],
    ["ავანტურა", "!", "რისკიანი, არაპროგნოზირებადი და გამბედავი პოლიტიკური ნაბიჯი."],
    ["ფალსიფიცირება", "F", "ინფორმაციის, შედეგის ან პროცესის დამახინჯება."],
    ["ჰაკერობა", "#", "მიმღები მოთამაშე დროებით აჩვენებს თავის კენჭებს."],
    ["ჩაშვება", "↓", "მიმღები მოთამაშე იღებს 2 დამატებით კენჭს ბაზრიდან."],
    ["ღალატი", "!", "მიმღები მოთამაშე იღებს 3 დამატებით კენჭს ბაზრიდან."],
    ["ანგარიშსწორება", "!", "მიმღები მოთამაშე იღებს 1 დამატებით კენჭს ბაზრიდან."],
    ["მოსყიდვა", "$", "რესურსის გამოყენებით გავლენის მოპოვება ან პოზიციის შეცვლა."],
    ["თავდასხმა", "⚡", "პირდაპირი დაპირისპირების ან ზეწოლის სვლა."],
    ["განეიტრალება", "−", "სხვისი გავლენის, სვლის ან ძალის შესუსტება."],
    ["გადაბირება", "↔", "სხვა მოთამაშის პოზიციის ან მხარის შეცვლის მცდელობა."],
  ].forEach(([name, symbol, meaning]) =>
    add({
      name,
      symbol,
      color: "black",
      kind: "pressure",
      countLabel: "1",
      meaning,
      effect:
        name === "ჰაკერობა"
          ? "reveal"
          : name === "ჩაშვება"
            ? "draw2"
            : name === "ღალატი"
              ? "draw3"
              : name === "ანგარიშსწორება"
                ? "draw1"
                : undefined,
    })
  );

  for (let money = 1; money <= 10; money += 1) {
    add({
      name: "თანხა",
      symbol: String(money),
      color: "yellow",
      kind: "money",
      countLabel: "1",
      meaning: `სიმბოლური ${money} მილიონი. გამოიყენება შეთანხმების, გავლენის ან დაპირისპირების ფასის განსაზღვრისთვის.`,
    });
  }

  add({ name: "+", symbol: "+", color: "red", kind: "special", countLabel: "1", meaning: "წითელი + აძლიერებს პოზიტიურ სვლას.", effect: "double" });
  add({ name: "+", symbol: "+", color: "black", kind: "special", countLabel: "1", meaning: "შავი + აძლიერებს ზეწოლის სვლას.", effect: "double" });

  add({ name: "-", symbol: "−", color: "red", kind: "special", countLabel: "1", meaning: "წითელი − ამცირებს პოზიტიური სვლის ძალას.", effect: "minus" });
  add({ name: "-", symbol: "−", color: "black", kind: "special", countLabel: "1", meaning: "შავი − ამცირებს მოწინააღმდეგის გავლენას.", effect: "minus" });

  add({ name: "0", symbol: "0", color: "red", kind: "special", countLabel: "1", meaning: "წინადადების აცილება ან პოზიციის დროებით არ დაფიქსირება.", effect: "skip" });
  add({ name: "0", symbol: "0", color: "black", kind: "special", countLabel: "1", meaning: "დაპირისპირების ან ზეწოლის სვლისგან თავის დაცვა.", effect: "skip" });
  add({ name: "0", symbol: "0", color: "yellow", kind: "special", countLabel: "1", meaning: "ნულოვანი ფასი ან ფინანსური აცილება.", effect: "skip" });

  add({ name: "↻", symbol: "↻", color: "red", kind: "special", countLabel: "1", meaning: "ცვლის თამაშის მიმართულებას.", effect: "reverse" });
  add({ name: "↻", symbol: "↻", color: "black", kind: "special", countLabel: "1", meaning: "ცვლის თამაშის მიმართულებას და არღვევს გათვლილ ხაზს.", effect: "reverse" });
  add({ name: "↻", symbol: "↻", color: "yellow", kind: "special", countLabel: "1", meaning: "ცვლის რესურსული მოძრაობის მიმართულებას.", effect: "reverse" });

  add({ name: "L", symbol: "L", color: "red", kind: "special", countLabel: "1", meaning: "თანამშრომლობითი ლიდერობის გამოცხადება.", effect: "leader" });
  add({ name: "L", symbol: "L", color: "black", kind: "special", countLabel: "1", meaning: "ძალაუფლებრივი ლიდერობის გამოცხადება.", effect: "leader" });
  add({ name: "L", symbol: "L", color: "yellow", kind: "special", countLabel: "1", meaning: "რესურსებზე დაფუძნებული ლიდერობის გამოცხადება.", effect: "leader" });

  add({ name: "∞", symbol: "∞", color: "red", kind: "special", countLabel: "1", meaning: "თამაშის ან შეთანხმებითი ციკლის განახლება.", effect: "refresh" });
  add({ name: "∞", symbol: "∞", color: "black", kind: "special", countLabel: "1", meaning: "კონფლიქტური ციკლის განახლება.", effect: "refresh" });

  add({ name: "სვლა", symbol: "♛", color: "green", kind: "start", countLabel: "1", meaning: "თამაშის საწყისი კენჭი. აქედან იწყება პოლიტიკური ჯაჭვი." });

  return deck;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getPlayer(state: GameState, id: string) {
  return state.players.find((player) => player.id === id);
}

function addJournal(state: GameState, text: string, tone: JournalEntry["tone"] = "normal"): GameState {
  return {
    ...state,
    journal: [
      {
        id: crypto.randomUUID(),
        turn: state.turn,
        text,
        tone,
      },
      ...state.journal,
    ].slice(0, 80),
  };
}

function playSound(type: "tile" | "chat" | "error", enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;

  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = type === "tile" ? 520 : type === "chat" ? 740 : 180;
    gain.gain.value = 0.045;

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, type === "error" ? 120 : 90);
  } catch {
    // sound is optional
  }
}

function nextPlayerId(players: Player[], currentId: string, direction: 1 | -1) {
  const index = players.findIndex((player) => player.id === currentId);
  const nextIndex = (index + direction + players.length) % players.length;
  return players[nextIndex].id;
}

function advanceTurn(state: GameState): GameState {
  let nextId = nextPlayerId(state.players, state.currentPlayerId, state.direction);
  let skipTurns = { ...state.skipTurns };
  let updatedState = { ...state };

  for (let guard = 0; guard < state.players.length; guard += 1) {
    const skipCount = skipTurns[nextId] ?? 0;

    if (skipCount > 0) {
      const skippedPlayer = getPlayer(state, nextId);
      skipTurns[nextId] = skipCount - 1;
      updatedState = addJournal(
        { ...updatedState, skipTurns },
        `${skippedPlayer?.name ?? "მოთამაშემ"} გამოტოვა სვლა.`,
        "warning"
      );
      nextId = nextPlayerId(state.players, nextId, state.direction);
    } else {
      break;
    }
  }

  const activePlayer = getPlayer(state, nextId);

  return {
    ...updatedState,
    currentPlayerId: nextId,
    skipTurns,
    selectedTileId: undefined,
    navigator:
      activePlayer?.type === "human"
        ? "თქვენი სვლაა. აირჩიეთ კენჭი, მონიშნეთ დაფაზე ადგილი და გამოიყენეთ სვლა."
        : `${activePlayer?.name ?? "AI"} ფიქრობს სვლაზე...`,
  };
}

function drawTiles(state: GameState, playerId: string, amount: number): GameState {
  const market = [...state.market];
  const drawn: Tile[] = [];

  for (let i = 0; i < amount; i += 1) {
    const tile = market.shift();
    if (tile) drawn.push(tile);
  }

  return {
    ...state,
    market,
    hands: {
      ...state.hands,
      [playerId]: [...(state.hands[playerId] ?? []), ...drawn],
    },
  };
}

function positionFromAnchor(anchor: BoardTile, side: AttachSide) {
  if (side === "right") return { x: anchor.x + CARD_STEP_X, y: anchor.y };
  if (side === "left") return { x: anchor.x - CARD_STEP_X, y: anchor.y };
  if (side === "top") return { x: anchor.x, y: anchor.y - CARD_STEP_Y };
  return { x: anchor.x, y: anchor.y + CARD_STEP_Y };
}

function isNear(a: number, b: number, limit: number) {
  return Math.abs(a - b) < limit;
}

function isOccupied(board: BoardTile[], x: number, y: number) {
  return board.some((node) => isNear(node.x, x, 62) && isNear(node.y, y, 88));
}

function validateMove(
  state: GameState,
  tile: Tile,
  anchorId: string | undefined,
  side: AttachSide,
  quiet = false
): { ok: true; x: number; y: number } | { ok: false; reason: string } {
  if (state.board.length === 0) {
    if (tile.name !== "სვლა") {
      return {
        ok: false,
        reason: "პირველი სვლა უნდა დაიწყოს კენჭით „სვლა“. სხვა კენჭი ცარიელ დაფაზე ვერ დაიდება.",
      };
    }

    return { ok: true, x: 0, y: 0 };
  }

  if (!anchorId) {
    return {
      ok: false,
      reason: "აირჩიეთ დაფაზე ის კენჭი, რომელსაც ახალ კენჭს მიადებთ.",
    };
  }

  const anchor = state.board.find((node) => node.id === anchorId);
  if (!anchor) {
    return {
      ok: false,
      reason: "არჩეული დაფის კენჭი ვერ მოიძებნა. თავიდან მონიშნეთ ადგილი.",
    };
  }

  const bothPolitical =
    (tile.color === "red" || tile.color === "black") &&
    (anchor.tile.color === "red" || anchor.tile.color === "black");

  if (bothPolitical && tile.color === anchor.tile.color) {
    return {
      ok: false,
      reason:
        tile.color === "red"
          ? "წესი: წითელ კენჭზე პირდაპირ წითელი კენჭი არ ედება. საჭიროა სხვა ფერის პასუხი ან სპეციალური/თანხის კენჭი."
          : "წესი: შავ კენჭზე პირდაპირ შავი კენჭი არ ედება. საჭიროა სხვა ფერის პასუხი ან სპეციალური/თანხის კენჭი.",
    };
  }

  const next = positionFromAnchor(anchor, side);

  if (isOccupied(state.board, next.x, next.y)) {
    return {
      ok: false,
      reason: quiet
        ? "ეს ადგილი დაკავებულია."
        : "ეს ადგილი უკვე დაკავებულია. აირჩიეთ სხვა მხარე: მარცხნივ, მარჯვნივ, ზემოთ ან ქვემოთ.",
    };
  }

  return { ok: true, x: next.x, y: next.y };
}

function applyEffects(state: GameState, tile: Tile, actorId: string, targetId: string): GameState {
  let updated = { ...state };

  if (tile.effect === "reveal") {
    updated = {
      ...updated,
      revealedPlayerId: targetId,
      navigator: `${tile.name}: მიმღები მოთამაშის კენჭები დროებით გახსნილია.`,
    };
    updated = addJournal(updated, `${tile.name}: მიმღები მოთამაშის კენჭები დროებით გამოჩნდა.`, "warning");
  }

  if (tile.effect === "draw1") {
    updated = drawTiles(updated, targetId, 1);
    updated = addJournal(updated, `${getPlayer(updated, targetId)?.name ?? "მოთამაშემ"} ბაზრიდან აიღო 1 კენჭი.`, "warning");
  }

  if (tile.effect === "draw2") {
    updated = drawTiles(updated, targetId, 2);
    updated = addJournal(updated, `${getPlayer(updated, targetId)?.name ?? "მოთამაშემ"} ბაზრიდან აიღო 2 კენჭი.`, "warning");
  }

  if (tile.effect === "draw3") {
    updated = drawTiles(updated, targetId, 3);
    updated = addJournal(updated, `${getPlayer(updated, targetId)?.name ?? "მოთამაშემ"} ბაზრიდან აიღო 3 კენჭი.`, "warning");
  }

  if (tile.effect === "reverse") {
    updated = {
      ...updated,
      direction: updated.direction === 1 ? -1 : 1,
    };
    updated = addJournal(updated, "თამაშის მიმართულება შეიცვალა.", "good");
  }

  if (tile.effect === "leader") {
    updated = {
      ...updated,
      leaderId: actorId,
    };
    updated = addJournal(updated, `${getPlayer(updated, actorId)?.name ?? "მოთამაშე"} გახდა ლიდერი.`, "good");
  }

  if (tile.effect === "refresh") {
    let market = [...updated.market];
    const hands = { ...updated.hands };

    updated.players.forEach((player) => {
      if (player.id !== actorId) {
        market = [...market, ...(hands[player.id] ?? [])];
        hands[player.id] = [];
      }
    });

    market = shuffle(market);

    updated.players.forEach((player) => {
      if (player.id !== actorId) {
        hands[player.id] = market.splice(0, 6);
      }
    });

    updated = {
      ...updated,
      market,
      hands,
    };

    updated = addJournal(updated, "∞: ყველა მოთამაშემ, სვლის ავტორის გარდა, ხელში არსებული კენჭები განაახლა.", "warning");
  }

  if (tile.effect === "skip") {
    updated = {
      ...updated,
      skipTurns: {
        ...updated.skipTurns,
        [targetId]: (updated.skipTurns[targetId] ?? 0) + 1,
      },
    };

    updated = addJournal(updated, `${getPlayer(updated, targetId)?.name ?? "მოთამაშე"} შემდეგ სვლას გამოტოვებს.`, "warning");
  }

  return updated;
}

function checkWinner(state: GameState, lastActorId: string): GameState {
  const hand = state.hands[lastActorId] ?? [];

  if (hand.length > 0) return state;

  const actor = getPlayer(state, lastActorId);
  const leader = state.leaderId ? getPlayer(state, state.leaderId) : undefined;

  if (leader && leader.id !== actor?.id) {
    return {
      ...state,
      gameOver: {
        title: `ლიდერის გამარჯვება — ${leader.name}`,
        description: `${actor?.name ?? "მოთამაშემ"} დაცალა კენჭები, მაგრამ თამაში დასრულდა ${leader.name}-ის ლიდერობის ქვეშ.`,
        winnerIds: [leader.id],
      },
    };
  }

  return {
    ...state,
    gameOver: {
      title: `გამარჯვებულია — ${actor?.name ?? "მოთამაშე"}`,
      description: "მოთამაშემ პირველმა გამოიყენა ყველა ხელში არსებული კენჭი.",
      winnerIds: [lastActorId],
    },
  };
}

function applyMove(
  state: GameState,
  actorId: string,
  tileId: string,
  targetId: string,
  anchorId: string | undefined,
  side: AttachSide,
  orientation: Orientation,
  phrase: string
): GameState {
  const actor = getPlayer(state, actorId);
  const target = getPlayer(state, targetId);
  const hand = state.hands[actorId] ?? [];
  const tile = hand.find((item) => item.id === tileId);

  if (!actor || !target || !tile) {
    return {
      ...state,
      navigator: "სვლა ვერ შესრულდა: მოთამაშე ან კენჭი ვერ მოიძებნა.",
    };
  }

  const validation = validateMove(state, tile, anchorId, side);

  if (!validation.ok) {
    return {
      ...state,
      navigator: validation.reason,
    };
  }

  const nextTurnNumber = state.turn + 1;

  let updated: GameState = {
    ...state,
    turn: nextTurnNumber,
    hands: {
      ...state.hands,
      [actorId]: hand.filter((item) => item.id !== tileId),
    },
    board: [
      ...state.board,
      {
        id: crypto.randomUUID(),
        tile,
        playerId: actorId,
        targetId,
        x: validation.x,
        y: validation.y,
        orientation,
        turn: nextTurnNumber,
        phrase,
      },
    ],
    selectedTileId: undefined,
    selectedBoardId: undefined,
    lastMove: {
      playerId: actorId,
      targetId,
      tileName: tile.name,
      phrase,
    },
    navigator: `${tile.name}: ${tile.meaning}`,
  };

  updated = addJournal(
    updated,
    `${actor.name}-მა დადო კენჭი „${tile.name}“ მოთამაშის მიმართ: ${target.name}.`,
    actor.type === "human" ? "good" : "normal"
  );

  updated = applyEffects(updated, tile, actorId, targetId);
  updated = checkWinner(updated, actorId);

  if (updated.gameOver) return updated;

  return advanceTurn(updated);
}

function findAiMove(state: GameState, aiId: string) {
  const hand = state.hands[aiId] ?? [];
  const possibleTargets = state.players.filter((player) => player.id !== aiId);
  const target = possibleTargets[Math.floor(Math.random() * possibleTargets.length)] ?? possibleTargets[0];
  const phrase = AI_PHRASES[Math.floor(Math.random() * AI_PHRASES.length)];

  if (state.board.length === 0) {
    const start = hand.find((tile) => tile.name === "სვლა");
    if (!start || !target) return undefined;

    return {
      tile: start,
      targetId: target.id,
      anchorId: undefined,
      side: "right" as AttachSide,
      orientation: "vertical" as Orientation,
      phrase,
    };
  }

  const sides: AttachSide[] = ["right", "left", "top", "bottom"];
  const orientations: Orientation[] = ["vertical", "horizontal"];
  const candidates: Array<{
    tile: Tile;
    targetId: string;
    anchorId: string;
    side: AttachSide;
    orientation: Orientation;
    phrase: string;
    score: number;
  }> = [];

  hand.forEach((tile) => {
    state.board.forEach((anchor) => {
      sides.forEach((side) => {
        orientations.forEach((orientation) => {
          const validation = validateMove(state, tile, anchor.id, side, true);
          if (validation.ok && target) {
            const score =
              tile.kind === "proposal"
                ? 4
                : tile.kind === "pressure"
                  ? 5
                  : tile.kind === "money"
                    ? 3
                    : tile.effect === "leader"
                      ? 6
                      : 2;

            candidates.push({
              tile,
              targetId: target.id,
              anchorId: anchor.id,
              side,
              orientation,
              phrase,
              score: score + Math.random() * 3,
            });
          }
        });
      });
    });
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

function performAiTurn(state: GameState): GameState {
  const current = getPlayer(state, state.currentPlayerId);
  if (!current || current.type !== "ai" || state.gameOver) return state;

  let updated = { ...state };
  let move = findAiMove(updated, current.id);

  let drawGuard = 0;
  while (!move && updated.market.length > 0 && drawGuard < 4) {
    updated = drawTiles(updated, current.id, 1);
    drawGuard += 1;
    move = findAiMove(updated, current.id);
  }

  if (!move) {
    updated = addJournal(updated, `${current.name}-ს არ ჰქონდა შესაძლო სვლა და რიგი გადავიდა.`, "warning");
    return advanceTurn(updated);
  }

  return applyMove(
    updated,
    current.id,
    move.tile.id,
    move.targetId,
    move.anchorId,
    move.side,
    move.orientation,
    move.phrase
  );
}

function createInitialState(roomId: string, playerName: string, avatarKey: string): GameState {
  const humanAvatarMap: Record<string, string> = {
    strategist: "🧠",
    diplomat: "🤝",
    leader: "👑",
    observer: "👁",
    speaker: "🎙",
    negotiator: "⚖️",
    reformer: "🌿",
    analyst: "📊",
  };

  const players: Player[] = [
    {
      id: "p0",
      name: playerName || "თქვენ",
      avatar: humanAvatarMap[avatarKey] ?? "👨🏻‍💼",
      type: "human",
    },
    ...AI_NAMES.map((name, index) => ({
      id: `p${index + 1}`,
      name,
      avatar: PLAYER_AVATARS[index + 1] ?? "🤖",
      type: "ai" as const,
    })),
  ];

  const deck = shuffle(buildDeck());
  const hands: Record<string, Tile[]> = {};

  players.forEach((player) => {
    hands[player.id] = deck.splice(0, 6);
  });

  const startOwner = players.find((player) => hands[player.id]?.some((tile) => tile.name === "სვლა")) ?? players[0];

  return {
    players,
    hands,
    market: deck,
    board: [],
    currentPlayerId: startOwner.id,
    direction: 1,
    turn: 0,
    targetPlayerId: players.find((player) => player.id !== players[0].id)?.id ?? players[0].id,
    attachSide: "right",
    orientation: "vertical",
    navigator:
      startOwner.type === "human"
        ? "თქვენ გაქვთ საწყისი სვლა. პირველი კენჭი უნდა იყოს „სვლა“."
        : `${startOwner.name} იწყებს თამაშს, რადგან მას აქვს კენჭი „სვლა“.`,
    journal: [
      {
        id: crypto.randomUUID(),
        turn: 1,
        text: `თამაში დაიწყო. ოთახი: ${roomId}. ყველა მოთამაშემ მიიღო 6 კენჭი. ბაზარში დარჩა ${deck.length} კენჭი.`,
        tone: "good",
      },
    ],
    chat: [
      {
        id: crypto.randomUUID(),
        fromId: "p1",
        mode: "public",
        text: "აბა, გელოდებით.",
        time: new Date().toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" }),
      },
    ],
    chatMode: "public",
    privateTargetId: "p1",
    chatDraft: "",
    soundOn: true,
    skipTurns: {},
  };
}

function getBoardView(board: BoardTile[]) {
  if (board.length === 0) {
    return { centerX: 0, centerY: 0, scale: 1 };
  }

  const xs = board.map((node) => node.x);
  const ys = board.map((node) => node.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = Math.max(160, maxX - minX + 170);
  const height = Math.max(180, maxY - minY + 210);

  const scale = Math.max(
    0.48,
    Math.min(1, (STAGE_W - 80) / width, (STAGE_H - 70) / height)
  );

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    scale,
  };
}

function TileCard({
  tile,
  selected,
  disabled,
  orientation = "vertical",
  compact = false,
  onClick,
}: {
  tile: Tile;
  selected?: boolean;
  disabled?: boolean;
  orientation?: Orientation;
  compact?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "svTile",
        `svTile-${tile.color}`,
        selected ? "selected" : "",
        disabled ? "disabled" : "",
        compact ? "compact" : "",
        orientation === "horizontal" ? "horizontal" : "",
      ].join(" ")}
      onClick={onClick}
      title={tile.meaning}
      disabled={disabled}
    >
      <span className="svTileName">{tile.name}</span>
      <span className="svTileLine" />
      <span className="svTileSymbol">{tile.symbol}</span>
    </button>
  );
}

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();

  const roomId = params?.roomId ?? "ROOM";
  const playerName = searchParams.get("name") || "თქვენ";
  const avatarKey = searchParams.get("avatar") || "diplomat";
  const mode = searchParams.get("mode") || "solo";

  const [game, setGame] = useState<GameState>(() => createInitialState(roomId, playerName, avatarKey));

  const currentPlayer = useMemo(() => getPlayer(game, game.currentPlayerId), [game]);
  const human = game.players[0];
  const humanHand = game.hands[human.id] ?? [];
  const selectedTile = humanHand.find((tile) => tile.id === game.selectedTileId);
  const boardView = getBoardView(game.board);

  useEffect(() => {
    if (!currentPlayer || currentPlayer.type !== "ai" || game.gameOver) return;

    const timer = window.setTimeout(() => {
      setGame((current) => {
        const active = getPlayer(current, current.currentPlayerId);
        if (!active || active.type !== "ai" || current.gameOver) return current;
        playSound("tile", current.soundOn);
        return performAiTurn(current);
      });
    }, 7000);

    return () => window.clearTimeout(timer);
  }, [currentPlayer?.id, currentPlayer?.type, game.gameOver, game.soundOn]);

  function selectHandTile(tile: Tile) {
    if (currentPlayer?.type !== "human") {
      setGame((state) => ({
        ...state,
        navigator: "ახლა AI მოთამაშის რიგია. დაელოდეთ მის სვლას.",
      }));
      playSound("error", game.soundOn);
      return;
    }

    setGame((state) => ({
      ...state,
      selectedTileId: tile.id,
      navigator: `${tile.name}: ${tile.meaning}`,
    }));
  }

  function selectBoardTile(nodeId: string) {
    setGame((state) => ({
      ...state,
      selectedBoardId: nodeId,
      navigator: "დაფაზე ადგილი მონიშნულია. ახლა აირჩიეთ მხარე და გამოიყენეთ სვლა.",
    }));
  }

  function humanPlay() {
    if (!selectedTile) {
      setGame((state) => ({
        ...state,
        navigator: "ჯერ აირჩიეთ თქვენი ხელიდან კენჭი.",
      }));
      playSound("error", game.soundOn);
      return;
    }

    setGame((state) => {
      if (state.currentPlayerId !== human.id) {
        playSound("error", state.soundOn);
        return {
          ...state,
          navigator: "ახლა თქვენი რიგი არ არის.",
        };
      }

      const phrase = HUMAN_PHRASES[Math.floor(Math.random() * HUMAN_PHRASES.length)];
      const next = applyMove(
        state,
        human.id,
        selectedTile.id,
        state.targetPlayerId,
        state.selectedBoardId,
        state.attachSide,
        state.orientation,
        phrase
      );

      if (next === state || next.navigator.includes("ვერ") || next.navigator.includes("წესი")) {
        playSound("error", state.soundOn);
      } else {
        playSound("tile", state.soundOn);
      }

      return next;
    });
  }

  function drawFromMarket() {
    setGame((state) => {
      if (state.currentPlayerId !== human.id) {
        return {
          ...state,
          navigator: "ბაზრიდან აღება მხოლოდ თქვენი რიგის დროს შეგიძლიათ.",
        };
      }

      if (state.market.length === 0) {
        return {
          ...state,
          navigator: "ბაზარი ცარიელია.",
        };
      }

      const updated = drawTiles(state, human.id, 1);
      return {
        ...addJournal(updated, `${human.name}-მა ბაზრიდან აიღო 1 კენჭი.`, "warning"),
        navigator: "თქვენ აიღეთ ერთი კენჭი ბაზრიდან.",
      };
    });
  }

  function sendChat() {
    const text = game.chatDraft.trim();
    if (!text) return;

    setGame((state) => ({
      ...state,
      chatDraft: "",
      chat: [
        {
          id: crypto.randomUUID(),
          fromId: human.id,
          toId: state.chatMode === "private" ? state.privateTargetId : undefined,
          mode: state.chatMode,
          text,
          time: new Date().toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" }),
        },
        ...state.chat,
      ].slice(0, 60),
    }));

    playSound("chat", game.soundOn);
  }

  function restartGame() {
    setGame(createInitialState(roomId, playerName, avatarKey));
  }

  return (
    <main className="svRoom">
      <header className="svHeader">
        <a className="svBrand" href="/">
          <span>ს</span>
          <strong>სვლები</strong>
        </a>

        <div className="svRoomMeta">
          <span>ოთახი: {roomId}</span>
          <span>რეჟიმი: {mode === "group" ? "ჯგუფური" : "მარტო"}</span>
          <span>მოთამაშე: {human.name}</span>
        </div>

        <div className="svHeaderActions">
          <button type="button" onClick={() => setGame((state) => ({ ...state, soundOn: !state.soundOn }))}>
            {game.soundOn ? "🔊 ხმა" : "🔇 ხმა"}
          </button>
          <button type="button" onClick={restartGame}>ახალი თამაში</button>
        </div>
      </header>

      <section className="svPlayersStrip">
        {game.players.map((player) => {
          const isActive = player.id === game.currentPlayerId;
          const isWinner = game.gameOver?.winnerIds.includes(player.id);
          return (
            <article
              className={["svPlayerCard", isActive ? "active" : "", isWinner ? "winner" : ""].join(" ")}
              key={player.id}
            >
              <div className="svAvatar">{player.avatar}</div>
              <div>
                <strong>{player.name}</strong>
                <span>{game.hands[player.id]?.length ?? 0} კენჭი</span>
              </div>

              {game.lastMove?.playerId === player.id && (
                <div className="svSpeech">
                  <b>{game.lastMove.tileName}</b>
                  <small>{game.lastMove.phrase}</small>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="svLayout">
        <section className="svMainColumn">
          <section className="svBoardPanel">
            <div className="svMarketBox">
              <strong>ბაზარი</strong>
              <div className="svMarketVisual" />
              <b>{game.market.length}</b>
              <button type="button" onClick={drawFromMarket}>აღება</button>
            </div>

            <div className="svBoardStage">
              <svg className="svLines" viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} preserveAspectRatio="none">
                {game.board.slice(1).map((node, index) => {
                  const previous = game.board[index];
                  const x1 = STAGE_W / 2 + (previous.x - boardView.centerX) * boardView.scale;
                  const y1 = STAGE_H / 2 + (previous.y - boardView.centerY) * boardView.scale;
                  const x2 = STAGE_W / 2 + (node.x - boardView.centerX) * boardView.scale;
                  const y2 = STAGE_H / 2 + (node.y - boardView.centerY) * boardView.scale;

                  return <line key={node.id} x1={x1} y1={y1} x2={x2} y2={y2} />;
                })}
              </svg>

              {game.board.length === 0 && (
                <div className="svEmptyBoard">
                  თამაში დაიწყება კენჭით „სვლა“.
                </div>
              )}

              {game.board.map((node) => {
                const left = STAGE_W / 2 + (node.x - boardView.centerX) * boardView.scale;
                const top = STAGE_H / 2 + (node.y - boardView.centerY) * boardView.scale;
                const selected = node.id === game.selectedBoardId;

                return (
                  <div
                    className={["svBoardTileWrap", selected ? "selectedAnchor" : ""].join(" ")}
                    key={node.id}
                    style={{
                      left,
                      top,
                      transform: `translate(-50%, -50%) scale(${boardView.scale})`,
                    }}
                    onClick={() => selectBoardTile(node.id)}
                  >
                    <TileCard tile={node.tile} orientation={node.orientation} compact />
                    <span className="svTileOwner">
                      {getPlayer(game, node.playerId)?.name} → {getPlayer(game, node.targetId)?.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="svControls">
            <div>
              <strong>მიმაგრება რომელ მხარეს?</strong>
              <div className="svMiniButtons">
                {(["left", "right", "top", "bottom"] as AttachSide[]).map((side) => (
                  <button
                    key={side}
                    type="button"
                    className={game.attachSide === side ? "on" : ""}
                    onClick={() => setGame((state) => ({ ...state, attachSide: side }))}
                  >
                    {side === "left" ? "მარცხნივ" : side === "right" ? "მარჯვნივ" : side === "top" ? "ზემოთ" : "ქვემოთ"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <strong>მიმართულება</strong>
              <div className="svMiniButtons">
                <button
                  type="button"
                  className={game.orientation === "vertical" ? "on" : ""}
                  onClick={() => setGame((state) => ({ ...state, orientation: "vertical" }))}
                >
                  ვერტ.
                </button>
                <button
                  type="button"
                  className={game.orientation === "horizontal" ? "on" : ""}
                  onClick={() => setGame((state) => ({ ...state, orientation: "horizontal" }))}
                >
                  ჰორ.
                </button>
              </div>
            </div>

            <div>
              <strong>ვის მიმართ?</strong>
              <select
                value={game.targetPlayerId}
                onChange={(event) => setGame((state) => ({ ...state, targetPlayerId: event.target.value }))}
              >
                {game.players
                  .filter((player) => player.id !== human.id)
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
              </select>
            </div>

            <button className="svPlayButton" type="button" onClick={humanPlay}>
              არჩეული სვლის გამოყენება →
            </button>
          </section>

          <section className="svBottom">
            <div className="svHandPanel">
              <h2>შენი კენჭები</h2>
              <div className="svHand">
                {humanHand.map((tile) => (
                  <TileCard
                    key={tile.id}
                    tile={tile}
                    selected={tile.id === game.selectedTileId}
                    disabled={currentPlayer?.type !== "human"}
                    onClick={() => selectHandTile(tile)}
                  />
                ))}
              </div>
            </div>

            <div className="svNavigator">
              <h2>ნავიგატორი — წესები, მნიშვნელობები, რჩევები</h2>
              <p>{game.navigator}</p>

              {selectedTile && (
                <div className="svSelectedInfo">
                  <strong>{selectedTile.name}</strong>
                  <span>{selectedTile.meaning}</span>
                </div>
              )}
            </div>
          </section>
        </section>

        <aside className="svSide">
          <section className="svJournal">
            <h2>სვლის ჟურნალი</h2>
            <div className="svJournalList">
              {game.journal.map((entry, index) => (
                <article className={[index === 0 ? "latest" : "", entry.tone ?? ""].join(" ")} key={entry.id}>
                  <span>{entry.turn}</span>
                  <p>{entry.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="svChat">
            <h2>ჩატი</h2>

            <div className="svChatModes">
              <button
                type="button"
                className={game.chatMode === "public" ? "on" : ""}
                onClick={() => setGame((state) => ({ ...state, chatMode: "public" }))}
              >
                საჯარო
              </button>
              <button
                type="button"
                className={game.chatMode === "private" ? "on" : ""}
                onClick={() => setGame((state) => ({ ...state, chatMode: "private" }))}
              >
                პირადი
              </button>
            </div>

            {game.chatMode === "private" && (
              <select
                value={game.privateTargetId}
                onChange={(event) => setGame((state) => ({ ...state, privateTargetId: event.target.value }))}
              >
                {game.players
                  .filter((player) => player.id !== human.id)
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
              </select>
            )}

            <div className="svChatList">
              {game.chat.map((message) => {
                const sender = getPlayer(game, message.fromId);
                const receiver = message.toId ? getPlayer(game, message.toId) : undefined;

                return (
                  <article key={message.id}>
                    <strong>
                      {sender?.name}
                      {receiver ? ` → ${receiver.name}` : ""}
                    </strong>
                    <p>{message.text}</p>
                    <span>{message.time}</span>
                  </article>
                );
              })}
            </div>

            <div className="svChatInput">
              <textarea
                value={game.chatDraft}
                onChange={(event) => setGame((state) => ({ ...state, chatDraft: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendChat();
                  }
                }}
                placeholder={game.chatMode === "public" ? "საჯარო შეტყობინება..." : "პირადი შეტყობინება..."}
              />
              <button type="button" onClick={sendChat}>➤</button>
            </div>
          </section>
        </aside>
      </section>

      {game.gameOver && (
        <section className="svGameOver">
          <div>
            <h2>{game.gameOver.title}</h2>
            <p>{game.gameOver.description}</p>
            <button type="button" onClick={restartGame}>ახალი თამაში</button>
          </div>
        </section>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f3efe8;
        }

        .svRoom {
          min-height: 100vh;
          background: #f3efe8;
          color: #102033;
          font-family: var(--font-georgian, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
        }

        .svHeader {
          position: sticky;
          top: 0;
          z-index: 40;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 18px;
          align-items: center;
          padding: 14px 22px;
          background: rgba(246, 243, 237, 0.96);
          border-bottom: 1px solid #dbe4df;
          backdrop-filter: blur(12px);
        }

        .svBrand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #102033;
        }

        .svBrand span {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: #0f948b;
          color: white;
          font-size: 30px;
          font-weight: 1000;
        }

        .svBrand strong {
          font-size: 30px;
          letter-spacing: -0.04em;
        }

        .svRoomMeta {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .svRoomMeta span,
        .svHeaderActions button {
          border: 1px solid #d6e0dc;
          background: white;
          color: #536574;
          border-radius: 999px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 900;
        }

        .svHeaderActions {
          display: flex;
          gap: 10px;
        }

        .svHeaderActions button {
          cursor: pointer;
        }

        .svHeaderActions button:last-child {
          background: #0f948b;
          color: white;
          border-color: #0f948b;
        }

        .svPlayersStrip {
          display: grid;
          grid-template-columns: repeat(6, minmax(150px, 1fr));
          gap: 10px;
          padding: 12px 12px 0;
        }

        .svPlayerCard {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 58px;
          padding: 10px;
          border-radius: 18px;
          background: white;
          border: 1px solid #dbe4df;
          box-shadow: 0 8px 18px rgba(16, 32, 51, 0.05);
        }

        .svPlayerCard.active {
          color: white;
          background: #0e7f75;
          border-color: #0e7f75;
          animation: activePulse 1.2s ease-in-out infinite alternate;
        }

        .svPlayerCard.winner {
          outline: 3px solid #e0b13c;
        }

        .svAvatar {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: #dff5ef;
          font-size: 20px;
          flex: 0 0 auto;
        }

        .svPlayerCard strong {
          display: block;
          font-size: 14px;
          font-weight: 1000;
        }

        .svPlayerCard span {
          display: block;
          font-size: 12px;
          font-weight: 900;
          opacity: 0.82;
        }

        .svSpeech {
          position: absolute;
          left: 14px;
          top: 62px;
          width: 190px;
          z-index: 60;
          color: #4a3400;
          background: #ffd84d;
          border: 2px solid #d59c00;
          border-radius: 18px;
          padding: 10px;
          box-shadow: 0 12px 24px rgba(16, 32, 51, 0.16);
          animation: speechIn 0.25s ease both;
        }

        .svSpeech::before {
          content: "";
          position: absolute;
          top: -9px;
          left: 24px;
          width: 16px;
          height: 16px;
          background: #ffd84d;
          border-left: 2px solid #d59c00;
          border-top: 2px solid #d59c00;
          transform: rotate(45deg);
        }

        .svSpeech b,
        .svSpeech small {
          display: block;
        }

        .svSpeech b {
          font-size: 13px;
          margin-bottom: 4px;
        }

        .svSpeech small {
          font-size: 12px;
          line-height: 1.3;
          font-weight: 800;
        }

        .svLayout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 330px;
          gap: 12px;
          padding: 12px;
        }

        .svMainColumn {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .svBoardPanel,
        .svControls,
        .svHandPanel,
        .svNavigator,
        .svJournal,
        .svChat {
          background: white;
          border: 1px solid #dbe4df;
          border-radius: 22px;
          box-shadow: 0 8px 18px rgba(16, 32, 51, 0.05);
        }

        .svBoardPanel {
          position: relative;
          min-height: 430px;
          overflow: hidden;
          padding: 18px;
        }

        .svMarketBox {
          position: absolute;
          top: 18px;
          left: 18px;
          z-index: 10;
          width: 132px;
          min-height: 132px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #dbe4df;
          display: grid;
          justify-items: center;
          align-content: center;
          gap: 6px;
          box-shadow: 0 8px 18px rgba(16, 32, 51, 0.08);
        }

        .svMarketBox strong {
          font-size: 14px;
          font-weight: 1000;
        }

        .svMarketBox b {
          font-size: 28px;
          line-height: 1;
        }

        .svMarketBox button {
          width: 88%;
          border: 0;
          border-radius: 999px;
          padding: 8px;
          background: #102033;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .svMarketVisual {
          width: 46px;
          height: 54px;
          border-radius: 10px;
          background: linear-gradient(145deg, #17243a, #0d1424);
          box-shadow: 7px 0 0 #17243a, 14px 0 0 #17243a;
        }

        .svBoardStage {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 390px;
          border: 1px dashed #9dd8d2;
          border-radius: 22px;
          background:
            radial-gradient(circle at center, rgba(15, 148, 139, 0.09), transparent 45%),
            #ffffff;
          overflow: hidden;
        }

        .svEmptyBoard {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: #8a98a6;
          font-size: 18px;
          font-weight: 900;
          text-align: center;
          padding: 24px;
        }

        .svLines {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .svLines line {
          stroke: rgba(118, 132, 143, 0.55);
          stroke-width: 4;
          stroke-linecap: round;
        }

        .svBoardTileWrap {
          position: absolute;
          z-index: 5;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .svBoardTileWrap.selectedAnchor {
          z-index: 8;
          filter: drop-shadow(0 0 0.75rem rgba(15, 148, 139, 0.45));
        }

        .svTileOwner {
          position: absolute;
          left: 50%;
          bottom: -19px;
          transform: translateX(-50%);
          white-space: nowrap;
          font-size: 9px;
          font-weight: 900;
          color: #566675;
          background: rgba(255,255,255,0.84);
          border-radius: 999px;
          padding: 3px 6px;
        }

        .svControls {
          display: grid;
          grid-template-columns: 1.1fr 0.7fr 1fr auto;
          gap: 12px;
          align-items: end;
          padding: 12px;
        }

        .svControls strong {
          display: block;
          margin-bottom: 8px;
          color: #667684;
          font-size: 13px;
          font-weight: 1000;
        }

        .svMiniButtons {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .svMiniButtons button,
        .svControls select,
        .svPlayButton {
          min-height: 38px;
          border-radius: 999px;
          border: 1px solid #dbe4df;
          background: white;
          color: #536574;
          padding: 8px 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .svMiniButtons button.on {
          background: #0f948b;
          color: white;
          border-color: #0f948b;
        }

        .svControls select {
          width: 100%;
        }

        .svPlayButton {
          background: #0f948b;
          color: white;
          border-color: #0f948b;
          padding-left: 18px;
          padding-right: 18px;
        }

        .svBottom {
          display: grid;
          grid-template-columns: minmax(360px, 0.95fr) minmax(360px, 1.05fr);
          gap: 10px;
        }

        .svHandPanel,
        .svNavigator {
          padding: 14px;
          min-width: 0;
        }

        .svHandPanel h2,
        .svNavigator h2,
        .svJournal h2,
        .svChat h2 {
          margin: 0 0 12px;
          font-size: 21px;
          letter-spacing: -0.03em;
        }

        .svHand {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .svNavigator p {
          margin: 0;
          color: #667684;
          font-weight: 800;
          line-height: 1.55;
        }

        .svSelectedInfo {
          margin-top: 14px;
          padding: 12px;
          border-radius: 16px;
          background: #fff8df;
          border: 1px solid #ecd98f;
        }

        .svSelectedInfo strong,
        .svSelectedInfo span {
          display: block;
        }

        .svSelectedInfo span {
          color: #6b7380;
          font-size: 14px;
          line-height: 1.45;
          margin-top: 4px;
        }

        .svSide {
          display: grid;
          grid-template-rows: minmax(260px, 0.8fr) minmax(310px, 1fr);
          gap: 10px;
          min-height: 0;
        }

        .svJournal,
        .svChat {
          padding: 14px;
          min-height: 0;
          overflow: hidden;
        }

        .svJournalList,
        .svChatList {
          display: grid;
          gap: 8px;
          overflow: auto;
          max-height: 360px;
          padding-right: 4px;
        }

        .svJournal article {
          display: grid;
          grid-template-columns: 36px 1fr;
          gap: 8px;
          align-items: start;
          padding: 10px;
          border-radius: 16px;
          border: 1px solid #dbe4df;
          background: #fbfcfb;
        }

        .svJournal article.latest {
          background: #ffe5df;
          border-color: #df8c80;
          animation: latestPulse 1.2s ease-in-out infinite alternate;
        }

        .svJournal article.good {
          border-color: #98d6c9;
        }

        .svJournal article.warning {
          border-color: #e5c776;
        }

        .svJournal article span {
          width: 30px;
          height: 30px;
          border-radius: 11px;
          display: grid;
          place-items: center;
          background: #dff5ef;
          color: #0f948b;
          font-weight: 1000;
        }

        .svJournal article p {
          margin: 0;
          color: #5c6d7b;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.45;
        }

        .svChatModes {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
        }

        .svChatModes button {
          border: 1px solid #dbe4df;
          background: white;
          border-radius: 999px;
          padding: 8px 14px;
          color: #536574;
          font-weight: 900;
          cursor: pointer;
        }

        .svChatModes button.on {
          background: #0f948b;
          border-color: #0f948b;
          color: white;
        }

        .svChat select {
          width: 100%;
          min-height: 38px;
          border-radius: 14px;
          border: 1px solid #dbe4df;
          margin-bottom: 10px;
          padding: 8px;
          font-weight: 800;
        }

        .svChatList {
          max-height: 280px;
          margin-bottom: 10px;
        }

        .svChatList article {
          padding: 10px;
          border-radius: 14px;
          background: #f7f7f4;
        }

        .svChatList strong {
          display: block;
          font-size: 12px;
          color: #102033;
        }

        .svChatList p {
          margin: 4px 0;
          color: #607180;
          font-size: 13px;
          line-height: 1.35;
          font-weight: 750;
        }

        .svChatList span {
          font-size: 11px;
          color: #9aa5ad;
          font-weight: 800;
        }

        .svChatInput {
          display: grid;
          grid-template-columns: 1fr 44px;
          gap: 8px;
        }

        .svChatInput textarea {
          min-height: 58px;
          resize: none;
          border: 1px solid #dbe4df;
          border-radius: 16px;
          padding: 12px;
          font: inherit;
          font-weight: 750;
        }

        .svChatInput button {
          border: 0;
          border-radius: 16px;
          background: #0f948b;
          color: white;
          font-size: 18px;
          cursor: pointer;
        }

        .svTile {
          width: 70px;
          height: 112px;
          min-width: 70px;
          border-radius: 18px;
          border: 7px solid #efdcae;
          padding: 8px 7px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          box-shadow:
            0 10px 18px rgba(16, 32, 51, 0.18),
            inset 0 2px 3px rgba(255,255,255,0.32),
            inset 0 -4px 8px rgba(0,0,0,0.16);
          transition: 0.14s ease;
        }

        .svTile.compact {
          width: 64px;
          height: 102px;
          min-width: 64px;
        }

        .svTile.horizontal {
          transform: rotate(90deg);
        }

        .svTile:hover {
          transform: translateY(-3px);
        }

        .svTile.horizontal:hover {
          transform: rotate(90deg) translateY(-3px);
        }

        .svTile.selected {
          outline: 3px solid #0f72ff;
          outline-offset: 2px;
        }

        .svTile.disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .svTile-red {
          background: linear-gradient(180deg, #d64a3d, #ad211d);
        }

        .svTile-black {
          background: linear-gradient(180deg, #1d2a40, #0b1323);
        }

        .svTile-yellow {
          background: linear-gradient(180deg, #efbd35, #c88d06);
        }

        .svTile-green {
          background: linear-gradient(180deg, #1fa76f, #0c704b);
        }

        .svTileName {
          color: #fff8ec;
          min-height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-size: 11px;
          line-height: 1.05;
          font-weight: 1000;
          word-break: break-word;
        }

        .svTile.compact .svTileName {
          font-size: 9px;
        }

        .svTileLine {
          width: 82%;
          height: 5px;
          border-radius: 999px;
          background: rgba(255, 248, 236, 0.42);
          box-shadow: inset 0 -2px 4px rgba(0,0,0,0.22);
        }

        .svTileSymbol {
          min-height: 34px;
          color: #fff8ec;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          line-height: 1;
          font-weight: 1000;
        }

        .svTile.compact .svTileSymbol {
          font-size: 24px;
        }

        .svGameOver {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          background: rgba(16, 32, 51, 0.45);
          padding: 20px;
        }

        .svGameOver div {
          max-width: 560px;
          border-radius: 28px;
          padding: 30px;
          background: white;
          text-align: center;
          box-shadow: 0 30px 80px rgba(16, 32, 51, 0.24);
        }

        .svGameOver h2 {
          margin: 0 0 12px;
          font-size: 34px;
        }

        .svGameOver p {
          margin: 0 0 20px;
          color: #607180;
          line-height: 1.55;
          font-weight: 800;
        }

        .svGameOver button {
          border: 0;
          border-radius: 999px;
          background: #0f948b;
          color: white;
          padding: 14px 24px;
          font-weight: 1000;
          cursor: pointer;
        }

        @keyframes activePulse {
          from { box-shadow: 0 0 0 rgba(15, 148, 139, 0); }
          to { box-shadow: 0 0 0 5px rgba(15, 148, 139, 0.16); }
        }

        @keyframes latestPulse {
          from { filter: brightness(1); }
          to { filter: brightness(0.96); }
        }

        @keyframes speechIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1180px) {
          .svLayout {
            grid-template-columns: 1fr;
          }

          .svSide {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto;
          }

          .svPlayersStrip {
            grid-template-columns: repeat(6, minmax(138px, 1fr));
            overflow-x: auto;
          }
        }

        @media (max-width: 900px) {
          .svHeader {
            grid-template-columns: 1fr;
            align-items: start;
          }

          .svRoomMeta {
            justify-content: flex-start;
          }

          .svControls {
            grid-template-columns: 1fr 1fr;
          }

          .svPlayButton {
            grid-column: 1 / -1;
          }

          .svBottom {
            grid-template-columns: 1fr;
          }

          .svSide {
            grid-template-columns: 1fr;
          }

          .svBoardPanel {
            min-height: 380px;
          }

          .svBoardStage {
            min-height: 340px;
          }

          .svMarketBox {
            width: 112px;
            min-height: 116px;
          }
        }

        @media (max-width: 560px) {
          .svHeader {
            padding: 12px;
          }

          .svBrand strong {
            font-size: 24px;
          }

          .svPlayersStrip {
            padding: 8px;
          }

          .svLayout {
            padding: 8px;
          }

          .svBoardPanel {
            min-height: 330px;
            padding: 10px;
          }

          .svBoardStage {
            min-height: 300px;
          }

          .svMarketBox {
            position: relative;
            top: auto;
            left: auto;
            width: 100%;
            min-height: 82px;
            grid-template-columns: auto 1fr auto auto;
            justify-items: start;
            padding: 10px;
            margin-bottom: 8px;
          }

          .svMarketVisual {
            width: 34px;
            height: 42px;
          }

          .svControls {
            grid-template-columns: 1fr;
          }

          .svHandPanel h2,
          .svNavigator h2,
          .svJournal h2,
          .svChat h2 {
            font-size: 18px;
          }

          .svTile {
            width: 62px;
            height: 100px;
            min-width: 62px;
            border-width: 6px;
          }

          .svTileName {
            font-size: 9px;
          }

          .svTileSymbol {
            font-size: 24px;
          }

          .svJournalList,
          .svChatList {
            max-height: 260px;
          }
        }
      `}</style>
    </main>
  );
}
