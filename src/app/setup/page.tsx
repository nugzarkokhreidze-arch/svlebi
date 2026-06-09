"use client";

import { useEffect, useMemo, useState } from "react";

type GameMode = "solo" | "group";

const avatars = [
  { id: "strategist", icon: "🧠", label: "სტრატეგი" },
  { id: "diplomat", icon: "🤝", label: "დიპლომატი" },
  { id: "leader", icon: "👑", label: "ლიდერი" },
  { id: "observer", icon: "👁️", label: "დამკვირვებელი" },
  { id: "speaker", icon: "🎙️", label: "ორატორი" },
  { id: "negotiator", icon: "⚖️", label: "მომლაპარაკებელი" },
  { id: "reformer", icon: "🌿", label: "რეფორმატორი" },
  { id: "analyst", icon: "📊", label: "ანალიტიკოსი" },
];

function createRoomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }

  return code;
}

function cleanRoomCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

export default function SetupPage() {
  const [mode, setMode] = useState<GameMode>("solo");
  const [realPlayers, setRealPlayers] = useState(2);
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0].id);
  const [roomCode, setRoomCode] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeFromUrl = params.get("mode");
    const roomFromUrl = params.get("room");
    const realPlayersFromUrl = Number(params.get("realPlayers"));

    if (modeFromUrl === "group") {
      setMode("group");
    }

    if (modeFromUrl === "solo") {
      setMode("solo");
    }

    if (Number.isFinite(realPlayersFromUrl) && realPlayersFromUrl >= 2 && realPlayersFromUrl <= 6) {
      setRealPlayers(realPlayersFromUrl);
    }

    const preparedRoomCode = roomFromUrl ? cleanRoomCode(roomFromUrl) : "";

    setRoomCode(preparedRoomCode || createRoomCode());
    setBaseUrl(window.location.origin);
  }, []);

  const aiPlayers = mode === "solo" ? 5 : 6 - realPlayers;

  const inviteLink = useMemo(() => {
    if (mode !== "group" || !roomCode || !baseUrl) return "";

    const params = new URLSearchParams({
      mode: "group",
      room: roomCode,
      realPlayers: String(realPlayers),
    });

    return `${baseUrl}/setup?${params.toString()}`;
  }, [baseUrl, mode, realPlayers, roomCode]);

  async function copyInviteLink() {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedInviteLink(true);
    } catch {
      window.prompt("დააკოპირეთ მოსაწვევი ბმული:", inviteLink);
      setCopiedInviteLink(true);
    }

    window.setTimeout(() => {
      setCopiedInviteLink(false);
    }, 1800);
  }

  function startGame() {
    const cleanName = nickname.trim() || "მოთამაშე";
    const avatar = avatars.find((item) => item.id === selectedAvatar);

    const params = new URLSearchParams({
      mode,
      name: cleanName,
      avatar: avatar?.id || "strategist",
      realPlayers: mode === "solo" ? "1" : String(realPlayers),
    });

    window.location.href = `/room/${roomCode}?${params.toString()}`;
  }

  return (
    <main className="setupPage">
      <a className="backLink" href="/">
        ← მთავარ გვერდზე დაბრუნება
      </a>

      <section className="setupBox setupBoxWide">
        <p className="label">თამაშის დაწყება</p>

        <h1>აირჩიე როგორ ითამაშებ</h1>

        <p className="setupIntro">
          შეარჩიე რეჟიმი, დაირქვი სახელი, აირჩიე ავატარი და შექმენი თამაშის
          ოთახი. თამაშში ყოველთვის იქნება 6 მოთამაშე — ცარიელ ადგილებს AI
          შეავსებს.
        </p>

        <div className="setupLayout">
          <div className="setupPanel">
            <h2>1. თამაშის რეჟიმი</h2>

            <div className="modeChoice">
              <button
                className={mode === "solo" ? "choice activeChoice" : "choice"}
                onClick={() => setMode("solo")}
                type="button"
              >
                <span>🎯</span>
                <strong>მარტო</strong>
                <small>შენ + 5 AI მოთამაშე</small>
              </button>

              <button
                className={mode === "group" ? "choice activeChoice" : "choice"}
                onClick={() => setMode("group")}
                type="button"
              >
                <span>👥</span>
                <strong>მეგობრებთან ერთად</strong>
                <small>რეალური მოთამაშეები + AI</small>
              </button>
            </div>

            {mode === "group" && (
              <div className="playersCountBox">
                <h3>რამდენი რეალური მოთამაშე ითამაშებს?</h3>

                <div className="countButtons">
                  {[2, 3, 4, 5, 6].map((number) => (
                    <button
                      key={number}
                      className={realPlayers === number ? "countActive" : ""}
                      onClick={() => setRealPlayers(number)}
                      type="button"
                    >
                      {number}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="summaryBox">
              <div>
                <span>რეალური მოთამაშე</span>
                <strong>{mode === "solo" ? 1 : realPlayers}</strong>
              </div>

              <div>
                <span>AI მოთამაშე</span>
                <strong>{aiPlayers}</strong>
              </div>

              <div>
                <span>სულ</span>
                <strong>6</strong>
              </div>
            </div>
          </div>

          <div className="setupPanel">
            <h2>2. სახელი და ავატარი</h2>

            <label className="inputLabel" htmlFor="nickname">
              შენი სახელი ან მეტსახელი
            </label>

            <input
              id="nickname"
              className="nameInput"
              maxLength={20}
              placeholder="მაგალითად: ნუგზარი"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />

            <p className="inputHint">{nickname.length}/20 სიმბოლო</p>

            <div className="avatarGrid">
              {avatars.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  className={
                    selectedAvatar === avatar.id
                      ? "avatarOption avatarSelected"
                      : "avatarOption"
                  }
                  onClick={() => setSelectedAvatar(avatar.id)}
                  title={avatar.label}
                >
                  <span>{avatar.icon}</span>
                  <small>{avatar.label}</small>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="roomPreview">
          <div>
            <span>ოთახის კოდი</span>
            <strong>{roomCode || "იქმნება..."}</strong>
          </div>

          <div>
            <span>რეჟიმი</span>
            <strong>{mode === "solo" ? "მარტო" : "მეგობრებთან ერთად"}</strong>
          </div>

          <div>
            <span>შევსება</span>
            <strong>{aiPlayers} AI</strong>
          </div>
        </div>

        {mode === "group" && (
          <div className="shareNotice inviteLinkBox">
            <div className="inviteLinkHeader">
              <div>
                <strong>მეგობრის მოსაწვევი ბმული</strong>
                <p>
                  გაუზიარე ეს ბმული მეგობარს. ის შევა ამავე ოთახის კოდით,
                  აირჩევს საკუთარ სახელს და ავატარს.
                </p>
              </div>

              <button
                className="smallInviteButton"
                onClick={() => setRoomCode(createRoomCode())}
                type="button"
              >
                ახალი კოდი
              </button>
            </div>

            <div className="inviteLinkRow">
              <input
                className="inviteLinkInput"
                value={inviteLink || "ბმული იქმნება..."}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
              />

              <button
                className="copyInviteButton"
                onClick={copyInviteLink}
                type="button"
              >
                {copiedInviteLink ? "დაკოპირდა ✓" : "ბმულის კოპირება"}
              </button>
            </div>

            <p className="inviteHint">
              მეგობარი ბმულზე გადასვლის შემდეგ დააჭერს „თამაშის შექმნა“-ს და
              შევა იგივე ოთახში: <b>{roomCode}</b>
            </p>
          </div>
        )}

        <button className="startGameButton" onClick={startGame} type="button">
          თამაშის შექმნა →
        </button>
      </section>
    </main>
  );
}
