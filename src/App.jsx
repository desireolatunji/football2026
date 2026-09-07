import React, { useEffect, useRef, useState } from "react";

const W = 1100;
const H = 650;

const FIELD = {
  left: 35,
  right: W - 35,
  top: 35,
  bottom: H - 35,
  goalLeft: 430,
  goalRight: 670,
};

const CENTER_X = W / 2;
const CENTER_Y = H / 2;

const HOME_COLOR = "#e83b4f";
const AWAY_COLOR = "#2878e8";

const FORMATIONS = {
  "4-3-3": [
    [550, 570],
    [210, 475],
    [390, 505],
    [710, 505],
    [890, 475],
    [380, 410],
    [550, 390],
    [720, 410],
    [300, 285],
    [550, 265],
    [800, 285],
  ],

  "4-4-2": [
    [550, 570],
    [210, 475],
    [390, 505],
    [710, 505],
    [890, 475],
    [250, 395],
    [430, 400],
    [670, 400],
    [850, 395],
    [450, 285],
    [650, 285],
  ],

  "4-2-3-1": [
    [550, 570],
    [210, 475],
    [390, 505],
    [710, 505],
    [890, 475],
    [430, 420],
    [670, 420],
    [300, 330],
    [550, 325],
    [800, 330],
    [550, 250],
  ],

  "3-5-2": [
    [550, 570],
    [300, 500],
    [550, 515],
    [800, 500],
    [210, 395],
    [370, 405],
    [550, 390],
    [730, 405],
    [890, 395],
    [455, 285],
    [645, 285],
  ],

  "5-3-2": [
    [550, 570],
    [150, 475],
    [310, 505],
    [550, 515],
    [790, 505],
    [950, 475],
    [390, 395],
    [550, 385],
    [710, 395],
    [455, 285],
    [645, 285],
  ],
};

const HOME_NAMES = [
  "Kiro",
  "Daxon",
  "Melo",
  "Rex",
  "Tavo",
  "Niko",
  "Jaro",
  "Vex",
  "Luno",
  "Zane",
  "Kane",
];

const AWAY_NAMES = [
  "Riko",
  "Bram",
  "Tenix",
  "Cruz",
  "Mavi",
  "Jex",
  "Rolan",
  "Vito",
  "Kobi",
  "Daro",
  "Nex",
];

const SKINS = [
  "#8d5524",
  "#a86f3d",
  "#6b3e26",
  "#c68642",
  "#4d2c1d",
  "#b77b50",
];

const clamp = (v, min, max) =>
  Math.max(min, Math.min(max, v));

const distance = (a, b) =>
  Math.hypot(a.x - b.x, a.y - b.y);

function normalize(x, y) {
  const length = Math.hypot(x, y);

  if (!length) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / length,
    y: y / length,
  };
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function getRole(formation, index) {
  if (index === 0) return "GK";

  if (formation === "4-3-3") {
    if (index <= 4) return "DEF";
    if (index <= 7) return "MID";
    return "ATT";
  }

  if (formation === "4-4-2") {
    if (index <= 4) return "DEF";
    if (index <= 8) return "MID";
    return "ATT";
  }

  if (formation === "4-2-3-1") {
    if (index <= 4) return "DEF";
    if (index <= 9) return "MID";
    return "ATT";
  }

  if (formation === "3-5-2") {
    if (index <= 3) return "DEF";
    if (index <= 8) return "MID";
    return "ATT";
  }

  if (formation === "5-3-2") {
    if (index <= 5) return "DEF";
    if (index <= 8) return "MID";
    return "ATT";
  }

  return "MID";
}

function createTeam(names, formation, side) {
  const positions = FORMATIONS[formation];
  const away = side === "away";

  return names.map((name, index) => {
    const [baseX, baseY] = positions[index];

    const x = away ? W - baseX : baseX;
    const y = away ? H - baseY : baseY;

    return {
      id: `${side}-${index}`,
      name,
      number: index + 1,

      role: getRole(formation, index),

      x,
      y,

      homeX: x,
      homeY: y,

      vx: 0,
      vy: 0,

      /*
        Slower AI.

        The old version was too fast.
      */
      speed:
        index === 0
          ? 1.55
          : index >= 8
          ? 1.95
          : index >= 5
          ? 1.82
          : 1.68,

      stamina: 100,

      facing: away ? Math.PI : 0,

      controlled: false,
      hasBall: false,

      decisionTimer:
        0.15 + Math.random() * 0.35,

      passCooldown: 0,
      shotCooldown: 0,
      tackleCooldown: 0,

      skin: SKINS[index % SKINS.length],

      aggression:
        0.72 + Math.random() * 0.18,

      passing:
        0.78 + Math.random() * 0.16,

      shooting:
        0.75 + Math.random() * 0.18,
    };
  });
}

function createGame(formation) {
  const home = createTeam(
    HOME_NAMES,
    formation,
    "home"
  );

  const away = createTeam(
    AWAY_NAMES,
    formation,
    "away"
  );

  /*
    Start with a midfielder instead of
    throwing a striker into everything.
  */
  home[6].controlled = true;

  return {
    home,
    away,

    ball: {
      x: CENTER_X,
      y: CENTER_Y,
      vx: 0,
      vy: 0,
      owner: null,
      free: true,
    },

    scoreHome: 0,
    scoreAway: 0,

    minute: 0,

    formation,

    paused: false,

    message: "",
    messageTimer: 0,

    shake: 0,

    lastTime: 0,
    clockTimer: 0,
  };
}

export default function App() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const keysRef = useRef({});

  const animationRef = useRef(null);

  const [screen, setScreen] = useState("menu");
  const [formation, setFormation] =
    useState("4-3-3");

  const [score, setScore] =
    useState("0 - 0");

  const [clock, setClock] =
    useState("00:00");

  const [paused, setPaused] =
    useState(false);

  const [message, setMessage] =
    useState("");

  function startMatch() {
    const game =
      createGame(formation);

    gameRef.current = game;

    setScore("0 - 0");
    setClock("00:00");
    setMessage("");
    setPaused(false);
    setScreen("game");
  }

  function exitMatch() {
    gameRef.current = null;

    setPaused(false);
    setMessage("");
    setScore("0 - 0");
    setClock("00:00");

    setScreen("menu");
  }

  function resetPositions(game) {
    const positions =
      FORMATIONS[game.formation];

    game.home.forEach((player, index) => {
      const [x, y] =
        positions[index];

      player.x = x;
      player.y = y;

      player.homeX = x;
      player.homeY = y;

      player.vx = 0;
      player.vy = 0;

      player.hasBall = false;
    });

    game.away.forEach((player, index) => {
      const [x, y] =
        positions[index];

      player.x = W - x;
      player.y = H - y;

      player.homeX = W - x;
      player.homeY = H - y;

      player.vx = 0;
      player.vy = 0;

      player.hasBall = false;
    });

    game.ball.x = CENTER_X;
    game.ball.y = CENTER_Y;

    game.ball.vx = 0;
    game.ball.vy = 0;

    game.ball.owner = null;
    game.ball.free = true;
  }

  function changeFormation(name) {
    setFormation(name);

    const game =
      gameRef.current;

    if (game) {
      game.formation = name;
      resetPositions(game);
    }
  }

  function getControlled(game) {
    return game.home.find(
      (player) =>
        player.controlled
    );
  }

  function switchPlayer() {
    const game =
      gameRef.current;

    if (!game) return;

    const current =
      getControlled(game);

    const candidates =
      game.home
        .filter(
          (player) =>
            player.role !== "GK"
        )
        .sort(
          (a, b) =>
            distance(a, game.ball) -
            distance(b, game.ball)
        );

    if (current) {
      current.controlled = false;
    }

    const next =
      candidates.find(
        (player) =>
          player.id !== current?.id
      ) || candidates[0];

    if (next) {
      next.controlled = true;
    }
  }

  function passBall(player) {
    const game =
      gameRef.current;

    if (
      !game ||
      !player ||
      !player.hasBall
    ) {
      return;
    }

    const teammates =
      game.home.filter(
        (mate) =>
          mate.id !== player.id &&
          mate.role !== "GK"
      );

    let best = null;
    let bestScore = -Infinity;

    for (const mate of teammates) {
      const d =
        distance(player, mate);

      if (d < 65 || d > 300) {
        continue;
      }

      const nearestOpponent =
        Math.min(
          ...game.away.map(
            (opponent) =>
              distance(mate, opponent)
          )
        );

      const forward =
        player.y - mate.y;

      const score =
        nearestOpponent * 0.8 +
        forward * 0.55 -
        d * 0.25;

      if (score > bestScore) {
        bestScore = score;
        best = mate;
      }
    }

    if (!best) return;

    const direction =
      normalize(
        best.x - player.x,
        best.y - player.y
      );

    player.hasBall = false;

    game.ball.owner = null;
    game.ball.free = true;

    game.ball.x =
      player.x +
      direction.x * 15;

    game.ball.y =
      player.y +
      direction.y * 15;

    game.ball.vx =
      direction.x * 6.8;

    game.ball.vy =
      direction.y * 6.8;

    player.passCooldown = 0.7;
  }

  function shootBall(player) {
    const game =
      gameRef.current;

    if (
      !game ||
      !player ||
      !player.hasBall
    ) {
      return;
    }

    const home =
      player.id.startsWith("home");

    const targetY = home
      ? FIELD.top
      : FIELD.bottom;

    const targetX =
      CENTER_X +
      clamp(
        (player.x - CENTER_X) *
          0.12,
        -75,
        75
      );

    const direction =
      normalize(
        targetX - player.x,
        targetY - player.y
      );

    player.hasBall = false;

    game.ball.owner = null;
    game.ball.free = true;

    game.ball.x =
      player.x +
      direction.x * 15;

    game.ball.y =
      player.y +
      direction.y * 15;

    game.ball.vx =
      direction.x * 9.8;

    game.ball.vy =
      direction.y * 9.8;

    game.shake = 6;
  }

  function tacklePlayer(player) {
    const game =
      gameRef.current;

    if (!game || !player) return;

    if (
      player.tackleCooldown > 0
    ) {
      return;
    }

    player.tackleCooldown =
      0.75;

    const opponents =
      player.id.startsWith("home")
        ? game.away
        : game.home;

    const opponent =
      opponents
        .filter(
          (p) => p.hasBall
        )
        .sort(
          (a, b) =>
            distance(player, a) -
            distance(player, b)
        )[0];

    if (!opponent) return;

    /*
      Much closer tackle range.
    */
    if (
      distance(player, opponent) <
      24
    ) {
      opponent.hasBall = false;

      game.ball.owner =
        player.id;

      game.ball.free = false;

      player.hasBall = true;
    }
  }

  function updateControlledPlayer(
    game,
    player,
    dt
  ) {
    const keys =
      keysRef.current;

    let dx = 0;
    let dy = 0;

    if (
      keys.w ||
      keys.arrowup
    ) {
      dy -= 1;
    }

    if (
      keys.s ||
      keys.arrowdown
    ) {
      dy += 1;
    }

    if (
      keys.a ||
      keys.arrowleft
    ) {
      dx -= 1;
    }

    if (
      keys.d ||
      keys.arrowright
    ) {
      dx += 1;
    }

    const direction =
      normalize(dx, dy);

    const moving =
      dx !== 0 ||
      dy !== 0;

    const sprint =
      keys.shift &&
      player.stamina > 5;

    /*
      Normal speed is intentionally
      slower than before.
    */
    const speed =
      sprint ? 3.35 : 2.35;

    if (moving) {
      player.x +=
        direction.x *
        speed *
        dt *
        60;

      player.y +=
        direction.y *
        speed *
        dt *
        60;

      player.facing =
        Math.atan2(
          direction.y,
          direction.x
        );

      if (sprint) {
        player.stamina -=
          dt * 17;
      } else {
        player.stamina +=
          dt * 6;
      }
    } else {
      player.stamina +=
        dt * 9;
    }

    player.stamina =
      clamp(
        player.stamina,
        0,
        100
      );

    player.x =
      clamp(
        player.x,
        55,
        W - 55
      );

    player.y =
      clamp(
        player.y,
        55,
        H - 55
      );
  }

  function getClosestPressers(
    game,
    team,
    opponents
  ) {
    const opponentHasBall =
      game.ball.owner &&
      opponents.some(
        (player) =>
          player.id ===
          game.ball.owner
      );

    if (!opponentHasBall) {
      return [];
    }

    const candidates =
      team
        .filter(
          (player) =>
            player.role !== "GK"
        )
        .map((player) => ({
          player,
          distance:
            distance(
              player,
              game.ball
            ),
        }))
        .sort(
          (a, b) =>
            a.distance -
            b.distance
        );

    if (!candidates.length) {
      return [];
    }

    /*
      Normally only ONE player presses.

      A second player may support,
      but only when the ball is nearby.
    */
    const result = [
      candidates[0].player,
    ];

    if (
      candidates[1] &&
      candidates[0].distance <
        170 &&
      candidates[1].distance <
        190
    ) {
      result.push(
        candidates[1].player
      );
    }

    return result;
  }

  function getAITarget(
    game,
    player,
    team,
    opponents
  ) {
    const home =
      player.id.startsWith(
        "home"
      );

    let targetX =
      player.homeX;

    let targetY =
      player.homeY;

    const owner =
      [
        ...game.home,
        ...game.away,
      ].find(
        (p) =>
          p.id === game.ball.owner
      );

    const ownTeamHasBall =
      owner &&
      owner.id.startsWith(
        home ? "home" : "away"
      );

    /*
      Small team movement toward
      the ball.

      This is deliberately limited
      so the formation doesn't collapse.
    */

    targetX += clamp(
      (game.ball.x - CENTER_X) *
        0.16,
      -55,
      55
    );

    targetY += clamp(
      (game.ball.y - CENTER_Y) *
        0.09,
      -35,
      35
    );

    /*
      DEFENDERS
    */

    if (
      player.role === "DEF" &&
      !ownTeamHasBall
    ) {
      const defensiveLine =
        home ? 470 : H - 470;

      if (home) {
        targetY =
          Math.max(
            targetY,
            defensiveLine
          );
      } else {
        targetY =
          Math.min(
            targetY,
            defensiveLine
          );
      }

      /*
        Centre defenders protect
        the middle.
      */
      if (
        player.number === 3 ||
        player.number === 4
      ) {
        targetX =
          lerp(
            targetX,
            CENTER_X,
            0.22
          );
      }
    }

    /*
      MIDFIELDERS
    */

    if (
      player.role === "MID"
    ) {
      targetX += clamp(
        game.ball.x -
          player.x,
        -70,
        70
      ) * 0.18;

      if (ownTeamHasBall) {
        targetY +=
          home ? -25 : 25;
      }
    }

    /*
      ATTACKERS
    */

    if (
      player.role === "ATT"
    ) {
      /*
        Keep attackers forward,
        but don't send them all
        directly to the ball.
      */
      targetY +=
        home ? -25 : 25;

      /*
        Wide attackers stay wide.
      */
      if (
        Math.abs(
          player.homeX -
            CENTER_X
        ) > 120
      ) {
        targetX +=
          player.homeX <
          CENTER_X
            ? -20
            : 20;
      }
    }

    /*
      PRESSING
    */

    const pressers =
      getClosestPressers(
        game,
        team,
        opponents
      );

    const shouldPress =
      pressers.some(
        (p) =>
          p.id === player.id
      );

    if (shouldPress) {
      const pressDistance =
        player.role === "DEF"
          ? 115
          : 145;

      if (
        distance(
          player,
          game.ball
        ) < pressDistance
      ) {
        targetX =
          game.ball.x;

        targetY =
          game.ball.y;
      }
    }

    /*
      MARKING.

      Defenders track the dangerous
      attacker without running
      completely out of position.
    */

    if (
      player.role === "DEF" &&
      !ownTeamHasBall &&
      owner &&
      owner.id.startsWith(
        home ? "away" : "home"
      )
    ) {
      const attackers =
        opponents.filter(
          (p) =>
            p.role === "ATT"
        );

      if (attackers.length) {
        const dangerous =
          attackers
            .slice()
            .sort(
              (a, b) =>
                distance(
                  a,
                  {
                    x: CENTER_X,
                    y: home
                      ? FIELD.top
                      : FIELD.bottom,
                  }
                ) -
                distance(
                  b,
                  {
                    x: CENTER_X,
                    y: home
                      ? FIELD.top
                      : FIELD.bottom,
                  }
                )
            )[0];

        if (
          dangerous &&
          distance(
            player,
            dangerous
          ) < 250
        ) {
          targetX =
            lerp(
              targetX,
              dangerous.x,
              0.22
            );

          if (home) {
            targetY =
              Math.max(
                targetY,
                dangerous.y +
                  60
              );
          } else {
            targetY =
              Math.min(
                targetY,
                dangerous.y -
                  60
              );
          }
        }
      }
    }

    /*
      SUPPORT WHEN WE HAVE THE BALL.
    */

    if (ownTeamHasBall) {
      if (
        player.role === "MID"
      ) {
        targetX += clamp(
          game.ball.x -
            player.x,
          -90,
          90
        ) * 0.12;
      }

      if (
        player.role === "ATT"
      ) {
        /*
          Attackers run into space
          instead of chasing the ball.
        */
        if (
          distance(
            player,
            game.ball
          ) < 105
        ) {
          targetX +=
            player.homeX <
            CENTER_X
              ? -65
              : 65;
        }
      }
    }

    /*
      GOALKEEPER.
    */

    if (
      player.role === "GK"
    ) {
      targetX =
        clamp(
          game.ball.x,
          470,
          630
        );

      if (home) {
        targetY =
          clamp(
            game.ball.y + 110,
            525,
            590
          );
      } else {
        targetY =
          clamp(
            game.ball.y - 110,
            60,
            125
          );
      }
    }

    return {
      x: clamp(
        targetX,
        55,
        W - 55
      ),

      y: clamp(
        targetY,
        55,
        H - 55
      ),
    };
  }

  function aiPass(
    game,
    player,
    teammate
  ) {
    const direction =
      normalize(
        teammate.x - player.x,
        teammate.y - player.y
      );

    const d =
      distance(
        player,
        teammate
      );

    const power =
      clamp(
        5.2 + d / 85,
        5.2,
        8.2
      );

    player.hasBall = false;

    game.ball.owner = null;
    game.ball.free = true;

    game.ball.x =
      player.x +
      direction.x * 15;

    game.ball.y =
      player.y +
      direction.y * 15;

    game.ball.vx =
      direction.x * power;

    game.ball.vy =
      direction.y * power;

    player.passCooldown =
      0.85;
  }

  function aiShoot(
    game,
    player
  ) {
    const home =
      player.id.startsWith(
        "home"
      );

    const goalY = home
      ? FIELD.top
      : FIELD.bottom;

    const targetX =
      CENTER_X +
      (Math.random() - 0.5) *
        100;

    const direction =
      normalize(
        targetX - player.x,
        goalY - player.y
      );

    player.hasBall = false;

    game.ball.owner = null;
    game.ball.free = true;

    game.ball.x =
      player.x +
      direction.x * 15;

    game.ball.y =
      player.y +
      direction.y * 15;

    game.ball.vx =
      direction.x * 9.5;

    game.ball.vy =
      direction.y * 9.5;

    player.shotCooldown =
      1.35;

    game.shake = 6;
  }

  function aiDecision(
    game,
    player,
    team,
    opponents
  ) {
    if (!player.hasBall) {
      return;
    }

    const home =
      player.id.startsWith(
        "home"
      );

    const goalY = home
      ? FIELD.top
      : FIELD.bottom;

    const goalDistance =
      Math.abs(
        player.y - goalY
      );

    /*
      Don't shoot from ridiculous
      distances.
    */

    if (
      goalDistance < 220 &&
      player.x > 350 &&
      player.x < 750 &&
      player.shotCooldown <= 0
    ) {
      const nearest =
        Math.min(
          ...opponents.map(
            (p) =>
              distance(
                player,
                p
              )
          )
        );

      /*
        If there is pressure,
        shooting becomes more likely.
      */
      const chance =
        nearest < 75
          ? 0.68
          : 0.38;

      if (
        Math.random() <
        chance
      ) {
        aiShoot(
          game,
          player
        );

        return;
      }
    }

    /*
      Find an open teammate.
    */

    const teammates =
      team.filter(
        (mate) =>
          mate.id !== player.id &&
          mate.role !== "GK"
      );

    let best = null;
    let bestScore = -Infinity;

    for (
      const mate of teammates
    ) {
      const d =
        distance(
          player,
          mate
        );

      if (
        d < 70 ||
        d > 290
      ) {
        continue;
      }

      const nearestOpponent =
        Math.min(
          ...opponents.map(
            (opponent) =>
              distance(
                mate,
                opponent
              )
          )
        );

      const forward =
        home
          ? player.y - mate.y
          : mate.y - player.y;

      const value =
        nearestOpponent * 0.8 +
        forward * 0.55 -
        d * 0.25;

      if (
        value >
        bestScore
      ) {
        bestScore =
          value;

        best =
          mate;
      }
    }

    const pressure =
      Math.min(
        ...opponents.map(
          (opponent) =>
            distance(
              player,
              opponent
            )
        )
      );

    /*
      Pass when pressured,
      or occasionally when there
      is a clear forward option.
    */

    if (
      best &&
      (
        pressure < 85 ||
        (
          bestScore > 80 &&
          Math.random() <
            0.025
        )
      ) &&
      player.passCooldown <= 0
    ) {
      aiPass(
        game,
        player,
        best
      );
    }
  }

  function updateAI(
    game,
    team,
    opponents,
    dt
  ) {
    for (
      const player of team
    ) {
      if (
        player.controlled
      ) {
        continue;
      }

      player.decisionTimer -=
        dt;

      player.passCooldown -=
        dt;

      player.shotCooldown -=
        dt;

      player.tackleCooldown -=
        dt;

      if (
        player.decisionTimer <=
        0
      ) {
        /*
          Decision speed is slower
          and more human-like.
        */
        player.decisionTimer =
          player.role === "DEF"
            ? 0.32
            : player.role === "MID"
            ? 0.24
            : 0.20;

        aiDecision(
          game,
          player,
          team,
          opponents
        );
      }

      const target =
        getAITarget(
          game,
          player,
          team,
          opponents
        );

      const dx =
        target.x -
        player.x;

      const dy =
        target.y -
        player.y;

      const d =
        Math.hypot(
          dx,
          dy
        );

      if (d > 6) {
        const direction =
          normalize(
            dx,
            dy
          );

        let speed =
          player.speed;

        /*
          Small acceleration,
          instead of instant maximum
          speed.
        */

        player.vx =
          lerp(
            player.vx,
            direction.x *
              speed,
            0.09
          );

        player.vy =
          lerp(
            player.vy,
            direction.y *
              speed,
            0.09
          );

        player.x +=
          player.vx *
          dt *
          60;

        player.y +=
          player.vy *
          dt *
          60;

        player.facing =
          Math.atan2(
            player.vy,
            player.vx
          );
      } else {
        player.vx *=
          0.8;

        player.vy *=
          0.8;
      }

      player.x =
        clamp(
          player.x,
          50,
          W - 50
        );

      player.y =
        clamp(
          player.y,
          50,
          H - 50
        );

      /*
        AI can win the ball,
        but must get genuinely close.
      */

      if (
        game.ball.owner
      ) {
        const owner =
          [
            ...game.home,
            ...game.away,
          ].find(
            (p) =>
              p.id ===
              game.ball.owner
          );

        if (
          owner &&
          owner.id.startsWith(
            player.id.startsWith(
              "home"
            )
              ? "away"
              : "home"
          )
        ) {
          const d =
            distance(
              player,
              owner
            );

          /*
            Realistic close range.
          */
          if (
            d < 21 &&
            player.tackleCooldown <=
              0
          ) {
            /*
              Small chance to miss
              rather than every tackle
              being perfect.
            */
            if (
              Math.random() <
              0.72
            ) {
              owner.hasBall =
                false;

              game.ball.owner =
                player.id;

              game.ball.free =
                false;

              player.hasBall =
                true;
            }

            player.tackleCooldown =
              0.8;
          }
        }
      }
    }
  }

  function separatePlayers(
    game
  ) {
    const teams = [
      game.home,
      game.away,
    ];

    for (
      const players of teams
    ) {
      for (
        let i = 0;
        i < players.length;
        i++
      ) {
        for (
          let j = i + 1;
          j < players.length;
          j++
        ) {
          const a =
            players[i];

          const b =
            players[j];

          const dx =
            b.x - a.x;

          const dy =
            b.y - a.y;

          const d =
            Math.hypot(
              dx,
              dy
            );

          if (
            d > 0 &&
            d < 36
          ) {
            const push =
              (36 - d) *
              0.035;

            const nx =
              dx / d;

            const ny =
              dy / d;

            if (!a.hasBall) {
              a.x -=
                nx * push;

              a.y -=
                ny * push;
            }

            if (!b.hasBall) {
              b.x +=
                nx * push;

              b.y +=
                ny * push;
            }
          }
        }
      }
    }
  }

  function updateBall(
    game,
    dt
  ) {
    const ball =
      game.ball;

    if (ball.owner) {
      const owner =
        [
          ...game.home,
          ...game.away,
        ].find(
          (player) =>
            player.id ===
            ball.owner
        );

      if (!owner) {
        ball.owner =
          null;

        ball.free =
          true;

        return;
      }

      /*
        Ball sits slightly ahead
        of player's body.
      */

      ball.x =
        owner.x +
        Math.cos(
          owner.facing
        ) *
          17;

      ball.y =
        owner.y +
        Math.sin(
          owner.facing
        ) *
          17;

      ball.vx = 0;
      ball.vy = 0;

      return;
    }

    ball.x +=
      ball.vx *
      dt *
      60;

    ball.y +=
      ball.vy *
      dt *
      60;

    ball.vx *=
      Math.pow(
        0.90,
        dt * 60
      );

    ball.vy *=
      Math.pow(
        0.90,
        dt * 60
      );

    /*
      Loose ball possession.
    */

    const players = [
      ...game.home,
      ...game.away,
    ];

    let closest = null;
    let closestDistance =
      Infinity;

    for (
      const player of players
    ) {
      const d =
        distance(
          player,
          ball
        );

      if (
        d <
        closestDistance
      ) {
        closestDistance =
          d;

        closest =
          player;
      }
    }

    if (
      closest &&
      closestDistance <
        19
    ) {
      ball.owner =
        closest.id;

      ball.free =
        false;

      closest.hasBall =
        true;

      return;
    }

    /*
      Side walls.
    */

    if (
      ball.x <
      FIELD.left
    ) {
      ball.x =
        FIELD.left;

      ball.vx *=
        -0.65;
    }

    if (
      ball.x >
      FIELD.right
    ) {
      ball.x =
        FIELD.right;

      ball.vx *=
        -0.65;
    }

    /*
      GOALS.
    */

    if (
      ball.y < 15 &&
      ball.x >
        FIELD.goalLeft &&
      ball.x <
        FIELD.goalRight
    ) {
      game.scoreHome++;

      scoreGoal(
        game,
        "NOVA FC"
      );

      return;
    }

    if (
      ball.y >
        H - 15 &&
      ball.x >
        FIELD.goalLeft &&
      ball.x <
        FIELD.goalRight
    ) {
      game.scoreAway++;

      scoreGoal(
        game,
        "VORTEX UNITED"
      );

      return;
    }

    /*
      Top/bottom field boundary
      outside goal.
    */

    if (
      ball.y <
      FIELD.top
    ) {
      ball.y =
        FIELD.top;

      ball.vy *=
        -0.6;
    }

    if (
      ball.y >
      FIELD.bottom
    ) {
      ball.y =
        FIELD.bottom;

      ball.vy *=
        -0.6;
    }
  }

  function scoreGoal(
    game,
    team
  ) {
    game.message =
      `${team} SCORES!`;

    game.messageTimer =
      2.5;

    game.shake =
      12;

    setMessage(
      game.message
    );

    setScore(
      `${game.scoreHome} - ${game.scoreAway}`
    );

    resetPositions(
      game
    );
  }

  function drawField(ctx) {
    ctx.fillStyle =
      "#17833c";

    ctx.fillRect(
      0,
      0,
      W,
      H
    );

    /*
      Grass stripes.
    */

    for (
      let i = 0;
      i < 12;
      i++
    ) {
      ctx.fillStyle =
        i % 2 === 0
          ? "rgba(255,255,255,0.025)"
          : "rgba(0,0,0,0.025)";

      const width =
        (FIELD.right -
          FIELD.left) /
        12;

      ctx.fillRect(
        FIELD.left +
          i * width,
        FIELD.top,
        width,
        FIELD.bottom -
          FIELD.top
      );
    }

    ctx.strokeStyle =
      "rgba(255,255,255,0.9)";

    ctx.lineWidth = 3;

    ctx.strokeRect(
      FIELD.left,
      FIELD.top,
      FIELD.right -
        FIELD.left,
      FIELD.bottom -
        FIELD.top
    );

    /*
      Halfway.
    */

    ctx.beginPath();

    ctx.moveTo(
      FIELD.left,
      CENTER_Y
    );

    ctx.lineTo(
      FIELD.right,
      CENTER_Y
    );

    ctx.stroke();

    /*
      Centre circle.
    */

    ctx.beginPath();

    ctx.arc(
      CENTER_X,
      CENTER_Y,
      72,
      0,
      Math.PI * 2
    );

    ctx.stroke();

    ctx.beginPath();

    ctx.arc(
      CENTER_X,
      CENTER_Y,
      4,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "white";

    ctx.fill();

    /*
      Penalty areas.
    */

    ctx.strokeRect(
      CENTER_X - 185,
      FIELD.top,
      370,
      125
    );

    ctx.strokeRect(
      CENTER_X - 185,
      FIELD.bottom - 125,
      370,
      125
    );

    /*
      Six-yard areas.
    */

    ctx.strokeRect(
      CENTER_X - 90,
      FIELD.top,
      180,
      55
    );

    ctx.strokeRect(
      CENTER_X - 90,
      FIELD.bottom - 55,
      180,
      55
    );

    /*
      Goals.
    */

    ctx.fillStyle =
      "rgba(255,255,255,0.22)";

    ctx.fillRect(
      FIELD.goalLeft,
      8,
      FIELD.goalRight -
        FIELD.goalLeft,
      8
    );

    ctx.fillRect(
      FIELD.goalLeft,
      H - 16,
      FIELD.goalRight -
        FIELD.goalLeft,
      8
    );
  }

  function drawPlayer(
    ctx,
    player,
    color,
    controlled
  ) {
    const moving =
      Math.abs(player.vx) +
        Math.abs(player.vy) >
      0.25;

    /*
      Shadow.
    */

    ctx.beginPath();

    ctx.ellipse(
      player.x,
      player.y + 13,
      16,
      7,
      0,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "rgba(0,0,0,0.28)";

    ctx.fill();

    /*
      Running animation.
    */

    const leg =
      moving
        ? Math.sin(
            Date.now() / 90
          ) * 4
        : 0;

    ctx.strokeStyle =
      "#222";

    ctx.lineWidth = 5;

    ctx.beginPath();

    ctx.moveTo(
      player.x - 5,
      player.y + 5
    );

    ctx.lineTo(
      player.x - 7 + leg,
      player.y + 17
    );

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
      player.x + 5,
      player.y + 5
    );

    ctx.lineTo(
      player.x + 7 - leg,
      player.y + 17
    );

    ctx.stroke();

    /*
      Body.
    */

    ctx.fillStyle =
      color;

    ctx.beginPath();

    ctx.roundRect(
      player.x - 12,
      player.y - 9,
      24,
      25,
      7
    );

    ctx.fill();

    /*
      Head.
    */

    ctx.beginPath();

    ctx.arc(
      player.x,
      player.y - 18,
      10,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      player.skin;

    ctx.fill();

    /*
      Hair.
    */

    ctx.beginPath();

    ctx.arc(
      player.x,
      player.y - 21,
      10,
      Math.PI,
      Math.PI * 2
    );

    ctx.fillStyle =
      "#151515";

    ctx.fill();

    /*
      Number.
    */

    ctx.textAlign =
      "center";

    ctx.font =
      "bold 10px Arial";

    ctx.fillStyle =
      "white";

    ctx.fillText(
      player.number,
      player.x,
      player.y + 5
    );

    /*
      Name.
    */

    ctx.font =
      "bold 9px Arial";

    ctx.fillStyle =
      "rgba(255,255,255,0.95)";

    ctx.fillText(
      player.name,
      player.x,
      player.y - 34
    );

    /*
      Controlled player.
    */

    if (controlled) {
      ctx.strokeStyle =
        "#ffd21f";

      ctx.lineWidth = 3;

      ctx.beginPath();

      ctx.arc(
        player.x,
        player.y,
        21,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      ctx.fillStyle =
        "#ffd21f";

      ctx.beginPath();

      ctx.moveTo(
        player.x,
        player.y - 50
      );

      ctx.lineTo(
        player.x - 6,
        player.y - 40
      );

      ctx.lineTo(
        player.x + 6,
        player.y - 40
      );

      ctx.closePath();

      ctx.fill();
    }

    /*
      Ball owner ring.
    */

    if (player.hasBall) {
      ctx.strokeStyle =
        "rgba(255,255,255,0.8)";

      ctx.lineWidth = 2;

      ctx.beginPath();

      ctx.arc(
        player.x,
        player.y,
        24,
        0,
        Math.PI * 2
      );

      ctx.stroke();
    }
  }

  function drawBall(
    ctx,
    ball
  ) {
    ctx.beginPath();

    ctx.arc(
      ball.x,
      ball.y,
      7,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "white";

    ctx.fill();

    ctx.strokeStyle =
      "rgba(0,0,0,0.4)";

    ctx.lineWidth = 2;

    ctx.stroke();

    ctx.fillStyle =
      "#222";

    ctx.beginPath();

    ctx.arc(
      ball.x - 2,
      ball.y - 2,
      2,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  function drawTopUI(
    ctx,
    game
  ) {
    ctx.fillStyle =
      "rgba(0,0,0,0.72)";

    ctx.fillRect(
      0,
      0,
      W,
      52
    );

    ctx.textAlign =
      "center";

    ctx.font =
      "bold 18px Arial";

    ctx.fillStyle =
      "white";

    ctx.fillText(
      "NOVA FC",
      260,
      32
    );

    ctx.font =
      "bold 25px Arial";

    ctx.fillText(
      `${game.scoreHome}  -  ${game.scoreAway}`,
      CENTER_X,
      34
    );

    ctx.font =
      "bold 18px Arial";

    ctx.fillText(
      "VORTEX UNITED",
      840,
      32
    );

    ctx.textAlign =
      "left";

    ctx.font =
      "bold 14px Arial";

    ctx.fillStyle =
      "rgba(255,255,255,0.8)";

    ctx.fillText(
      `${String(
        Math.floor(game.minute)
      ).padStart(2, "0")}:00`,
      20,
      32
    );
  }

  function drawGoalMessage(
    ctx,
    game
  ) {
    if (
      game.messageTimer <= 0
    ) {
      return;
    }

    ctx.fillStyle =
      "rgba(0,0,0,0.65)";

    ctx.fillRect(
      250,
      240,
      600,
      120
    );

    ctx.fillStyle =
      "white";

    ctx.textAlign =
      "center";

    ctx.font =
      "bold 42px Arial";

    ctx.fillText(
      game.message,
      CENTER_X,
      315
    );
  }

  function render(game) {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext(
        "2d"
      );

    ctx.clearRect(
      0,
      0,
      W,
      H
    );

    ctx.save();

    if (
      game.shake > 0
    ) {
      const amount =
        game.shake;

      ctx.translate(
        (Math.random() -
          0.5) *
          amount,
        (Math.random() -
          0.5) *
          amount
      );

      game.shake *=
        0.88;

      if (
        game.shake < 0.2
      ) {
        game.shake = 0;
      }
    }

    drawField(ctx);

    for (
      const player of
      game.home
    ) {
      drawPlayer(
        ctx,
        player,
        HOME_COLOR,
        player.controlled
      );
    }

    for (
      const player of
      game.away
    ) {
      drawPlayer(
        ctx,
        player,
        AWAY_COLOR,
        false
      );
    }

    drawBall(
      ctx,
      game.ball
    );

    ctx.restore();

    drawTopUI(
      ctx,
      game
    );

    drawGoalMessage(
      ctx,
      game
    );

    if (game.paused) {
      ctx.fillStyle =
        "rgba(0,0,0,0.58)";

      ctx.fillRect(
        0,
        0,
        W,
        H
      );

      ctx.fillStyle =
        "white";

      ctx.textAlign =
        "center";

      ctx.font =
        "bold 48px Arial";

      ctx.fillText(
        "PAUSED",
        CENTER_X,
        CENTER_Y
      );

      ctx.font =
        "18px Arial";

      ctx.fillText(
        "Press ESC to resume",
        CENTER_X,
        CENTER_Y + 45
      );
    }
  }

  function gameLoop(time) {
    const game =
      gameRef.current;

    if (
      !game ||
      screen !== "game"
    ) {
      return;
    }

    if (!game.lastTime) {
      game.lastTime =
        time;
    }

    const dt =
      Math.min(
        (time -
          game.lastTime) /
          1000,
        0.033
      );

    game.lastTime =
      time;

    if (!game.paused) {
      /*
        Match clock.
      */
      game.minute +=
        dt * 0.25;

      game.messageTimer -=
        dt;

      /*
        User player.
      */
      const controlled =
        getControlled(game);

      if (controlled) {
        updateControlledPlayer(
          game,
          controlled,
          dt
        );
      }

      /*
        Team AI.
      */
      updateAI(
        game,
        game.home,
        game.away,
        dt
      );

      updateAI(
        game,
        game.away,
        game.home,
        dt
      );

      separatePlayers(
        game
      );

      updateBall(
        game,
        dt
      );

      /*
        Keep possession state
        synchronized.
      */
      [
        ...game.home,
        ...game.away,
      ].forEach(
        (player) => {
          player.hasBall =
            game.ball.owner ===
            player.id;
        }
      );

      /*
        UI clock.
      */
      game.clockTimer +=
        dt;

      if (
        game.clockTimer >=
        1
      ) {
        game.clockTimer =
          0;

        const total =
          Math.floor(
            game.minute * 60
          );

        const minutes =
          Math.floor(
            total / 60
          );

        const seconds =
          total % 60;

        setClock(
          `${String(
            minutes
          ).padStart(
            2,
            "0"
          )}:${String(
            seconds
          ).padStart(
            2,
            "0"
          )}`
        );

        setScore(
          `${game.scoreHome} - ${game.scoreAway}`
        );
      }
    }

    render(game);

    animationRef.current =
      requestAnimationFrame(
        gameLoop
      );
  }

  useEffect(() => {
    if (
      screen !== "game"
    ) {
      if (
        animationRef.current
      ) {
        cancelAnimationFrame(
          animationRef.current
        );
      }

      return;
    }

    animationRef.current =
      requestAnimationFrame(
        gameLoop
      );

    return () => {
      if (
        animationRef.current
      ) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, [screen]);

  useEffect(() => {
    function keyDown(e) {
      const key =
        e.key.toLowerCase();

      keysRef.current[key] =
        true;

      if (
        screen !== "game"
      ) {
        return;
      }

      const game =
        gameRef.current;

      if (!game) return;

      if (
        [
          " ",
          "tab",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
        ].includes(key)
      ) {
        e.preventDefault();
      }

      if (
        key === "escape"
      ) {
        game.paused =
          !game.paused;

        setPaused(
          game.paused
        );

        return;
      }

      if (game.paused) {
        return;
      }

      const player =
        getControlled(game);

      if (!player) {
        return;
      }

      if (
        key === "q"
      ) {
        passBall(player);
      }

      if (
        key === " "
      ) {
        shootBall(player);
      }

      if (
        key === "e"
      ) {
        tacklePlayer(player);
      }

      if (
        key === "tab"
      ) {
        switchPlayer();
      }
    }

    function keyUp(e) {
      keysRef.current[
        e.key.toLowerCase()
      ] = false;
    }

    window.addEventListener(
      "keydown",
      keyDown
    );

    window.addEventListener(
      "keyup",
      keyUp
    );

    return () => {
      window.removeEventListener(
        "keydown",
        keyDown
      );

      window.removeEventListener(
        "keyup",
        keyUp
      );
    };
  }, [screen]);

  /*
    MENU
  */

  if (
    screen === "menu"
  ) {
    return (
      <div style={styles.page}>
        <div style={styles.menu}>
          <h1 style={styles.logo}>
            FOOTBALL
            <span> 2026</span>
          </h1>

          <div
            style={
              styles.subtitle
            }
          >
            NOVA FC
          </div>

          <div
            style={styles.matchCard}
          >
            <div>
              <strong>
                NOVA FC
              </strong>

              <small>
                YOUR TEAM
              </small>
            </div>

            <b style={styles.vs}>
              VS
            </b>

            <div
              style={{
                textAlign:
                  "right",
              }}
            >
              <strong>
                VORTEX UNITED
              </strong>

              <small>
                OPPONENT
              </small>
            </div>
          </div>

          <button
            style={
              styles.primary
            }
            onClick={
              startMatch
            }
          >
            PLAY MATCH
          </button>

          <button
            style={
              styles.secondary
            }
            onClick={() =>
              setScreen(
                "tactics"
              )
            }
          >
            TACTICS
          </button>

          <div
            style={
              styles.controls
            }
          >
            <b>
              CONTROLS
            </b>

            <br />

            WASD / ARROWS —
            MOVE

            <br />

            SHIFT — SPRINT

            <br />

            Q — PASS

            <br />

            SPACE — SHOOT

            <br />

            E — TACKLE

            <br />

            TAB — SWITCH PLAYER

            <br />

            ESC — PAUSE
          </div>
        </div>
      </div>
    );
  }

  /*
    TACTICS
  */

  if (
    screen === "tactics"
  ) {
    return (
      <div style={styles.page}>
        <div
          style={
            styles.tactics
          }
        >
          <h1>
            TACTICS
          </h1>

          <p
            style={{
              color:
                "#aaa",
            }}
          >
            Choose your
            formation.
          </p>

          <div
            style={
              styles.formations
            }
          >
            {Object.keys(
              FORMATIONS
            ).map(
              (name) => (
                <button
                  key={name}
                  onClick={() =>
                    changeFormation(
                      name
                    )
                  }
                  style={{
                    ...styles.formation,
                    border:
                      formation ===
                      name
                        ? "2px solid #ffd21f"
                        : "2px solid #333",
                  }}
                >
                  <div
                    style={
                      styles.pitch
                    }
                  >
                    {FORMATIONS[
                      name
                    ].map(
                      (
                        position,
                        index
                      ) => {
                        const x =
                          ((position[0] -
                            150) /
                            800) *
                          100;

                        const y =
                          ((position[1] -
                            200) /
                            400) *
                          100;

                        return (
                          <i
                            key={
                              index
                            }
                            style={{
                              ...styles.dot,
                              left: `${clamp(
                                x,
                                5,
                                95
                              )}%`,
                              top: `${clamp(
                                y,
                                5,
                                95
                              )}%`,
                            }}
                          />
                        );
                      }
                    )}
                  </div>

                  <strong>
                    {name}
                  </strong>
                </button>
              )
            )}
          </div>

          <button
            style={
              styles.primary
            }
            onClick={() =>
              setScreen(
                "menu"
              )
            }
          >
            BACK
          </button>
        </div>
      </div>
    );
  }

  /*
    GAME
  */

  return (
    <div
      style={
        styles.gamePage
      }
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={
          styles.canvas
        }
      />

      <div
        style={
          styles.gameControls
        }
      >
        <button
          onClick={() => {
            const game =
              gameRef.current;

            if (!game) return;

            game.paused =
              !game.paused;

            setPaused(
              game.paused
            );
          }}
        >
          {paused
            ? "RESUME"
            : "PAUSE"}
        </button>

        <button
          onClick={() =>
            setScreen(
              "tactics"
            )
          }
        >
          TACTICS
        </button>

        <button
          onClick={
            exitMatch
          }
        >
          EXIT MATCH
        </button>
      </div>

      <div
        style={
          styles.gameInfo
        }
      >
        {message ||
          `NOVA FC ${score} VORTEX UNITED • ${clock}`}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #182338, #070a10 70%)",
    color: "white",
    display: "flex",
    justifyContent:
      "center",
    alignItems:
      "center",
    padding: 20,
    boxSizing:
      "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  menu: {
    width: 650,
    maxWidth: "100%",
    textAlign:
      "center",
  },

  logo: {
    fontSize: 56,
    fontWeight: 900,
    letterSpacing: -3,
    marginBottom: 5,
  },

  subtitle: {
    color: "#ffd21f",
    fontWeight: 900,
    letterSpacing: 5,
    marginBottom: 30,
  },

  matchCard: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    background:
      "rgba(255,255,255,0.06)",
    border:
      "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
  },

  vs: {
    color: "#ffd21f",
    fontSize: 24,
  },

  primary: {
    width: "100%",
    padding: "17px 20px",
    border: 0,
    borderRadius: 12,
    background: "#ffd21f",
    color: "#111",
    fontSize: 17,
    fontWeight: 900,
    cursor: "pointer",
    marginBottom: 12,
  },

  secondary: {
    width: "100%",
    padding: "15px 20px",
    border:
      "1px solid #444",
    borderRadius: 12,
    background:
      "#151922",
    color: "white",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    marginBottom: 20,
  },

  controls: {
    color: "#aaa",
    lineHeight: 1.8,
    fontSize: 13,
  },

  tactics: {
    width: 850,
    maxWidth: "100%",
    textAlign:
      "center",
  },

  formations: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 15,
    margin: "30px 0",
  },

  formation: {
    background:
      "#11151d",
    color: "white",
    borderRadius: 15,
    padding: 12,
    cursor: "pointer",
  },

  pitch: {
    height: 150,
    background:
      "#176b37",
    border:
      "1px solid rgba(255,255,255,0.4)",
    borderRadius: 8,
    position:
      "relative",
    marginBottom: 10,
    overflow:
      "hidden",
  },

  dot: {
    position:
      "absolute",
    width: 9,
    height: 9,
    borderRadius:
      "50%",
    background:
      "#e83b4f",
    transform:
      "translate(-50%, -50%)",
    border:
      "1px solid white",
  },

  gamePage: {
    minHeight: "100vh",
    background:
      "#06090d",
    display: "flex",
    flexDirection:
      "column",
    justifyContent:
      "center",
    alignItems:
      "center",
    padding: 15,
    boxSizing:
      "border-box",
    gap: 10,
  },

  canvas: {
    width:
      "min(1100px, 96vw)",
    height: "auto",
    aspectRatio:
      "1100 / 650",
    display:
      "block",
    borderRadius: 14,
    boxShadow:
      "0 20px 60px rgba(0,0,0,0.55)",
  },

  gameControls: {
    display:
      "flex",
    gap: 8,
    flexWrap:
      "wrap",
    justifyContent:
      "center",
  },

  gameInfo: {
    color:
      "#aaa",
    fontSize: 12,
    textAlign:
      "center",
  },
};