"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Player = {
  id: string;
  name: string;
  avatar: string;
  type: "human" | "ai";
  tileCount: number;
  position: "top" | "topRight" | "right" | "bottomRight" | "bottom" | "left";
};

type GameTile = {
  id: string;
  name: string;
  symbol: string;
  color: "red" | "black" | "teal" | "gold";
  description: string;
};

const avatarMap: Record<string, string> = {
  strategist: "🧠",
  diplomat: "🤝",
  leader: "👑",
  observer: "👁️",
  speaker: "🎙️",
  negotiator: "⚖️",
  reformer: "🌿",
  analyst: "📊",
};

const aiPlayers = [
  { name: "ნინო AI", avatar: "👩‍💼" },
  { name: "გიორგი AI", avatar: "🧔" },
  { name: "მარიამ AI", avatar: "👩" },
  { name: "ლევანი AI", avatar: "👨‍🦳" },
  { name: "დავით AI", avatar: "🕶️" },
];

/* აქ არის მთავარი გასწორება — უკვე ზუსტად 6 კენჭია */
const initialHand: GameTile[] = [
  {
    id: "alliance",
    name: "ალიანსი",
    symbol: "+",
    color: "red",
    description: "შესთავაზე მოთამაშეს თანამშრომლობა ან საერთო მოქმედება.",
  },
  {
    id: "neutrality",
    name: "ნეიტრალობა",
    symbol: "0",
    color: "teal",
    description: "დააფიქსირე ნეიტრალური პოზიცია ან აიცილე დაპირისპირება.",
  },
  {
    id: "bribery",
    name: "მოსყიდვა",
    symbol: "L",
    color: "black",
    description: "ზეწოლის სვლა. გამოიყენება მოთამაშეზე გავლენის მოსაპოვებლად.",
  },
  {
    id: "exposure",
    name: "მხილება",
    symbol: "!",
    color: "red",
    description: "მიმღები მოთამაშე დროებით აჩვენებს თავის კენჭებს.",
  },
  {
    id: "money5",
    name: "თანხა",
    symbol: "5",
    color: "gold",
    description: "სიმბოლური 5 მილიონი შეთანხმების ფასისთვის.",
  },
  {
    id: "zero",
    name: "0",
    symbol: "0",
    color: "black",
    description: "სვლის გამოტოვება ან წინადადების აცილება.",
  },
];

const boardTiles: GameTile[] = [
  {
    id: "board-1",
    name: "სვლა",
    symbol: "♛",
    color: "teal",
    description: "თამაშის საწყისი ციკლი.",
  },
  {
    id: "board-2",
    name: "ალიანსი",
    symbol: "+",
    color: "red",
    description: "თანამშრომლობის შეთავაზება.",
  },
  {
    id: "board-3",
    name: "ნეიტრალობა",
    symbol: "0",
    color: "teal",
    description: "პოზიციის არ დაფიქსირება.",
  },
  {
    id: "board-4",
    name: "მოსყიდვა",
    symbol: "L",
    color: "black",
    description: "ზეწოლის სვლა.",
  },
];

function tileClass(color: GameTile["color"]) {
  if (color === "red") return "roomTile redRoomTile";
  if (color === "black") return "roomTile blackRoomTile";
  if (color === "gold") return "roomTile goldRoomTile";
  return "roomTile tealRoomTile";
}

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const roomId = String(params.roomId || "ROOM");
  const mode = searchParams.get("mode") || "solo";
  const playerName = searchParams.get("name") || "მოთამაშე";
  const avatarId = searchParams.get("avatar") || "strategist";

  const [hand, setHand] = useState<GameTile[]>(initialHand);
  const [selectedTileId, setSelectedTileId] = useState(initialHand[0].id);
  const [selectedTargetId, setSelectedTargetId] = useState("ai-1");
  const [marketCount, setMarketCount] = useState(24);
  const [log, setLog] = useState<string[]>([
    "თამაში დაიწყო. ყველა მოთამაშემ მიიღო 6 კენჭი.",
    "სისტემამ დაადგინა პირველი სვლა.",
    "თქვენი ჯერია — აირჩიეთ კენჭი და სამიზნე მოთამაშე.",
  ]);

  const players: Player[] = useMemo(
    () => [
      {
        id: "ai-1",
        name: aiPlayers[0].name,
        avatar: aiPlayers[0].avatar,
        type: "ai",
        tileCount: 6,
        position: "top",
      },
      {
        id: "ai-2",
        name: aiPlayers[1].name,
        avatar: aiPlayers[1].avatar,
        type: "ai",
        tileCount: 6,
        position: "topRight",
      },
      {
        id: "ai-3",
        name: aiPlayers[2].name,
        avatar: aiPlayers[2].avatar,
        type: "ai",
        tileCount: 6,
        position: "right",
      },
      {
        id: "ai-4",
        name: aiPlayers[3].name,
        avatar: aiPlayers[3].avatar,
        type: "ai",
        tileCount: 6,
        position: "bottomRight",
      },
      {
        id: "human",
        name: playerName,
        avatar: avatarMap[avatarId] || "🧠",
        type: "human",
        tileCount: hand.length,
        position: "bottom",
      },
      {
        id: "ai-5",
        name: aiPlayers[4].name,
        avatar: aiPlayers[4].avatar,
        type: "ai",
        tileCount: 6,
        position: "left",
      },
    ],
    [avatarId, hand.length, playerName]
  );

  const selectedTile = hand.find((tile) => tile.id === selectedTileId);

  function makeMove() {
    const selectedTarget = players.find((player) => player.id === selectedTargetId);

    if (!selectedTile || !selectedTarget) {
      return;
    }

    const newLogItem = `${playerName}-მა გამოიყენა „${selectedTile.name}“ მოთამაშის მიმართ: ${selectedTarget.name}.`;

    const remaining = hand.filter((tile) => tile.id !== selectedTile.id);

    setLog((previous) => [newLogItem, ...previous]);
    setHand(remaining);
    setSelectedTileId(remaining[0]?.id || "");

    if (selectedTile.id === "money5") {
      setMarketCount((count) => Math.max(0, count - 1));
    }
  }

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

        <a className="gameTopButton" href="/setup">
          ახალი თამაში
        </a>
      </header>

      <section className="gameShell">
        <aside className="leftGamePanel">
          <div className="panelCard">
            <h2>ბაზარი</h2>

            <div className="marketVisual">
              <div className="marketStack"></div>
              <strong>{marketCount}</strong>
              <span>კენჭი დარჩა</span>
            </div>
          </div>

          <div className="panelCard">
            <h2>მიმდინარე სვლა</h2>

            <div className="turnBox">
              <span className="turnAvatar">{avatarMap[avatarId] || "🧠"}</span>
              <div>
                <strong>თქვენი ჯერია</strong>
                <p>აირჩიეთ კენჭი და სამიზნე მოთამაშე.</p>
              </div>
            </div>
          </div>

          <div className="panelCard">
            <h2>აქტიური ეფექტები</h2>

            <ul className="effectsList">
              <li>ალიანსის შეთავაზება შესაძლებელია</li>
              <li>ერთ დიალოგში მაქსიმუმ 3 კენჭი</li>
              <li>AI მოთამაშეები ავტომატურად პასუხობენ</li>
            </ul>
          </div>
        </aside>

        <section className="centerGameArea">
          <div className="tableArea">
            {players.map((player) => (
              <div
                className={`playerSeat seat-${player.position} ${
                  player.type === "human" ? "humanSeat" : ""
                }`}
                key={player.id}
              >
                <div className="playerAvatar">{player.avatar}</div>
                <strong>{player.name}</strong>
                <span>{player.tileCount} კენჭი</span>
              </div>
            ))}

            <div className="dominoBoard">
              {boardTiles.map((tile) => (
                <div className={tileClass(tile.color)} key={tile.id}>
                  <span>{tile.name}</span>
                  <b>{tile.symbol}</b>
                </div>
              ))}
            </div>
          </div>

          <div className="moveControls">
            <div>
              <label htmlFor="target">ვის მიმართ აკეთებ სვლას?</label>
              <select
                id="target"
                value={selectedTargetId}
                onChange={(event) => setSelectedTargetId(event.target.value)}
              >
                {players
                  .filter((player) => player.id !== "human")
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
              </select>
            </div>

            <button onClick={makeMove} type="button" disabled={!selectedTile}>
              სვლის გაკეთება →
            </button>
          </div>

          <div className="playerHandArea">
            <div className="handTitle">
              <h2>შენი კენჭები</h2>
              <p>კენჭზე დაჭერით ნახავ მის მნიშვნელობას და მოამზადებ სვლას.</p>
            </div>

            <div className="handTiles">
              {hand.map((tile) => (
                <button
                  className={`${tileClass(tile.color)} ${
                    selectedTileId === tile.id ? "selectedRoomTile" : ""
                  }`}
                  key={tile.id}
                  onClick={() => setSelectedTileId(tile.id)}
                  title={tile.description}
                  type="button"
                >
                  <span>{tile.name}</span>
                  <b>{tile.symbol}</b>
                </button>
              ))}
            </div>

            <div className="tileDescriptionBox">
              {selectedTile ? (
                <>
                  <strong>{selectedTile.name}</strong>
                  <p>{selectedTile.description}</p>
                </>
              ) : (
                <p>კენჭები აღარ გაქვთ. შემდეგ ეტაპზე აქ გამოჩნდება გამარჯვების შემოწმება.</p>
              )}
            </div>
          </div>
        </section>

        <aside className="rightGamePanel">
          <div className="panelCard logCard">
            <h2>სვლის ჟურნალი</h2>

            <div className="moveLogList">
              {log.map((item, index) => (
                <div className="logItem" key={`${item}-${index}`}>
                  <span>{index + 1}</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panelCard chatCard">
            <div className="chatHeader">
              <h2>ჩატი</h2>
              <div>
                <button className="chatActive" type="button">
                  საჯარო
                </button>
                <button type="button">პირადი</button>
              </div>
            </div>

            <div className="chatMessages">
              <p>
                <strong>ნინო AI:</strong> მზად ვარ ალიანსისთვის.
              </p>
              <p>
                <strong>გიორგი AI:</strong> ჯერ დავაკვირდები სიტუაციას.
              </p>
              <p>
                <strong>მარიამ AI:</strong> საინტერესო სვლა იქნება.
              </p>
            </div>

            <div className="chatInputFake">
              <span>შეტყობინება...</span>
              <button type="button">➤</button>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
