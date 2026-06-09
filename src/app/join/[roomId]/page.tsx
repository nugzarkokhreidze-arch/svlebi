"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { isSupabaseConfigured, supabase } from "../../../lib/supabaseClient";

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

const guestSeats = [
  { seatId: "ai-1", name: "ნინო AI" },
  { seatId: "ai-2", name: "გიორგი AI" },
  { seatId: "ai-3", name: "მარიამ AI" },
  { seatId: "ai-4", name: "ლევანი AI" },
  { seatId: "ai-5", name: "დავით AI" },
];

function makePlayerId(roomCode: string, seatId: string) {
  return `${roomCode}-${seatId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export default function JoinRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const roomId = String(params.roomId || "").toUpperCase();
  const realPlayersFromUrl = Number(searchParams.get("realPlayers") || "2");

  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0].id);
  const [statusText, setStatusText] = useState("ოთახის მონაცემები მოწმდება...");
  const [isJoining, setIsJoining] = useState(false);
  const [realPlayers, setRealPlayers] = useState(
    Number.isFinite(realPlayersFromUrl) && realPlayersFromUrl >= 2 && realPlayersFromUrl <= 6
      ? realPlayersFromUrl
      : 2
  );
  const [takenSeats, setTakenSeats] = useState<string[]>([]);

  const availableSeats = useMemo(() => {
    const allowedGuestSeats = guestSeats.slice(0, Math.max(0, realPlayers - 1));
    return allowedGuestSeats.filter((seat) => !takenSeats.includes(seat.seatId));
  }, [realPlayers, takenSeats]);

  useEffect(() => {
    async function loadRoom() {
      if (!isSupabaseConfigured || !supabase) {
        setStatusText("Supabase კავშირი ჯერ არ არის გამართული.");
        return;
      }

      const { data: room } = await supabase
        .from("svlebi_rooms")
        .select("room_code, real_players, status")
        .eq("room_code", roomId)
        .maybeSingle();

      if (room?.real_players) {
        setRealPlayers(room.real_players);
      }

      if (!room) {
        await supabase.from("svlebi_rooms").insert({
          room_code: roomId,
          real_players: realPlayers,
          status: "lobby",
        });
      }

      const { data: players } = await supabase
        .from("svlebi_room_players")
        .select("seat_id")
        .eq("room_code", roomId);

      setTakenSeats((players || []).map((player) => player.seat_id));
      setStatusText("აირჩიეთ სახელი და ავატარი, შემდეგ შედით საერთო ოთახში.");
    }

    loadRoom();
  }, [realPlayers, roomId]);

  async function joinRoom() {
    if (!isSupabaseConfigured || !supabase) {
      setStatusText("Supabase კავშირი არ არის გამართული.");
      return;
    }

    const cleanName = nickname.trim() || "მოთამაშე";
    const nextSeat = availableSeats[0];

    if (!nextSeat) {
      setStatusText("ამ ოთახში რეალური მოთამაშეების ადგილები უკვე შევსებულია.");
      return;
    }

    setIsJoining(true);
    setStatusText(`თქვენ ჯდებით ${nextSeat.name}-ის ადგილზე...`);

    await supabase.from("svlebi_rooms").upsert(
      {
        room_code: roomId,
        real_players: realPlayers,
        status: "lobby",
      },
      { onConflict: "room_code" }
    );

    const playerId = makePlayerId(roomId, nextSeat.seatId);

    const { error } = await supabase.from("svlebi_room_players").insert({
      id: playerId,
      room_code: roomId,
      seat_id: nextSeat.seatId,
      name: cleanName,
      avatar: selectedAvatar,
      is_host: false,
    });

    if (error) {
      setIsJoining(false);
      setStatusText("ეს ადგილი უკვე დაკავებულია. განაახლეთ გვერდი და სცადეთ თავიდან.");
      return;
    }

    const urlParams = new URLSearchParams({
      mode: "group",
      name: cleanName,
      avatar: selectedAvatar,
      realPlayers: String(realPlayers),
      seat: nextSeat.seatId,
      playerId,
    });

    window.location.href = `/room/${roomId}?${urlParams.toString()}`;
  }

  return (
    <main className="setupPage">
      <a className="backLink" href="/">
        ← მთავარ გვერდზე დაბრუნება
      </a>

      <section className="setupBox setupBoxWide">
        <p className="label">მეგობრის შესვლა</p>

        <h1>შესვლა საერთო ოთახში</h1>

        <p className="setupIntro">
          თქვენ მიწვეული ხართ თამაშში. აირჩიეთ სახელი და ავატარი. სისტემა
          ავტომატურად დაგსვამთ პირველ თავისუფალ AI მოთამაშის ადგილზე.
        </p>

        <div className="roomPreview">
          <div>
            <span>ოთახის კოდი</span>
            <strong>{roomId}</strong>
          </div>

          <div>
            <span>რეალური მოთამაშე</span>
            <strong>{realPlayers}</strong>
          </div>

          <div>
            <span>თავისუფალი ადგილი</span>
            <strong>{availableSeats.length}</strong>
          </div>
        </div>

        <div className="setupPanel joinPanel">
          <h2>შენი სახელი და ავატარი</h2>

          <label className="inputLabel" htmlFor="nickname">
            სახელი ან მეტსახელი
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

        <div className="shareNotice joinSeatNotice">
          <strong>ადგილების რიგითობა</strong>
          <p>
            1-ლი მეგობარი ჩაანაცვლებს ნინო AI-ს, 2-ე — გიორგი AI-ს, 3-ე —
            მარიამ AI-ს, 4-ე — ლევანი AI-ს, 5-ე — დავით AI-ს.
          </p>
          <p>{statusText}</p>
        </div>

        <button
          className="startGameButton"
          onClick={joinRoom}
          disabled={isJoining || availableSeats.length === 0}
          type="button"
        >
          {isJoining ? "შესვლა..." : "თამაშში შესვლა →"}
        </button>
      </section>
    </main>
  );
}
