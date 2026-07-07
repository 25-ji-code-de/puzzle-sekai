import ichika from "./assets/chara/ichika.png";
import saki from "./assets/chara/saki.png";
import honami from "./assets/chara/honami.png";
import shiho from "./assets/chara/shiho.png";
import mikuLeo from "./assets/chara/miku_leo.png";

import minori from "./assets/chara/minori.png";
import haruka from "./assets/chara/haruka.png";
import airi from "./assets/chara/airi.png";
import shizuku from "./assets/chara/shizuku.png";
import mikuMMJ from "./assets/chara/miku_mmj.png";

import kohane from "./assets/chara/kohane.png";
import an from "./assets/chara/an.png";
import akito from "./assets/chara/akito.png";
import toya from "./assets/chara/toya.png";
import mikuVBS from "./assets/chara/miku_vbs.png";

import tsukasa from "./assets/chara/tsukasa.png";
import emu from "./assets/chara/emu.png";
import nene from "./assets/chara/nene.png";
import rui from "./assets/chara/rui.png";
import nenerobo from "./assets/chara/nenerobo.png";
import neneroboSmall from "./assets/chara/nenerobo_small.png";
import mikuWxS from "./assets/chara/miku_wxs.png";

import kanade from "./assets/chara/kanade.png";
import mafuyu from "./assets/chara/mafuyu.png";
import ena from "./assets/chara/ena.png";
import mizuki from "./assets/chara/mizuki.png";
import miku25ji from "./assets/chara/miku_25ji.png";

import ichika_1 from "./assets/sounds/chara/ichika_1.wav";
import ichika_2 from "./assets/sounds/chara/ichika_2.wav";
import saki_1 from "./assets/sounds/chara/saki_1.wav";
import saki_2 from "./assets/sounds/chara/saki_2.wav";
import honami_1 from "./assets/sounds/chara/honami_1.wav";
import honami_2 from "./assets/sounds/chara/honami_2.wav";
import shiho_1 from "./assets/sounds/chara/shiho_1.wav";
import shiho_2 from "./assets/sounds/chara/shiho_2.wav";
import minori_1 from "./assets/sounds/chara/minori_1.wav";
import haruka_1 from "./assets/sounds/chara/haruka_1.wav";
import airi_1 from "./assets/sounds/chara/airi_1.wav";
import airi_2 from "./assets/sounds/chara/airi_2.wav";
import shizuku_1 from "./assets/sounds/chara/shizuku_1.wav";
import shizuku_2 from "./assets/sounds/chara/shizuku_2.wav";
import kohane_1 from "./assets/sounds/chara/kohane_1.wav";
import kohane_2 from "./assets/sounds/chara/kohane_2.wav";
import an_1 from "./assets/sounds/chara/an_1.wav";
import an_2 from "./assets/sounds/chara/an_2.wav";
import akito_1 from "./assets/sounds/chara/akito_1.wav";
import akito_2 from "./assets/sounds/chara/akito_2.wav";
import toya_1 from "./assets/sounds/chara/toya_1.wav";
import toya_2 from "./assets/sounds/chara/toya_2.wav";
import tsukasa_1 from "./assets/sounds/chara/tsukasa_1.wav";
import emu_1 from "./assets/sounds/chara/emu_1.wav";
import emu_2 from "./assets/sounds/chara/emu_2.wav";
import emu_3 from "./assets/sounds/chara/emu_3.wav";
import nene_1 from "./assets/sounds/chara/nene_1.wav";
import nene_2 from "./assets/sounds/chara/nene_2.wav";
import rui_1 from "./assets/sounds/chara/rui_1.wav";
import rui_2 from "./assets/sounds/chara/rui_2.wav";
import kanade_1 from "./assets/sounds/chara/kanade_1.wav";
import mafuyu_1 from "./assets/sounds/chara/mafuyu_1.wav";
import mafuyu_2 from "./assets/sounds/chara/mafuyu_2.wav";
import ena_1 from "./assets/sounds/chara/ena_1.wav";
import mizuki_1 from "./assets/sounds/chara/mizuki_1.wav";

import bandSound from "./assets/sounds/band.wav";
import idolSound from "./assets/sounds/idol.wav";
import streetSound from "./assets/sounds/street.wav";
import wonderSound from "./assets/sounds/wonder.wav";
import nightSound from "./assets/sounds/night.wav";

export const groupSounds: { [group: string]: string } = {
  "Leo/need": bandSound,
  "MORE MORE JUMP!": idolSound,
  "Vivid BAD SQUAD": streetSound,
  "Wonderlands×Showtime": wonderSound,
  "25時": nightSound,
};

export interface CharacterData {
  name: string;
  file: string;
  group: string;
  preview?: string;
  sounds?: {
    fall?: string[];
  };
}
export const characterData: CharacterData[] = [
  {
    name: "Ichika",
    file: ichika,
    group: "Leo/need",
    sounds: {
      fall: [ichika_1, ichika_2],
    },
  },
  {
    name: "Saki",
    file: saki,
    group: "Leo/need",
    sounds: {
      fall: [saki_1, saki_2],
    },
  },
  {
    name: "Honami",
    file: honami,
    group: "Leo/need",
    sounds: {
      fall: [honami_1, honami_2],
    },
  },
  {
    name: "Shiho",
    file: shiho,
    group: "Leo/need",
    sounds: {
      fall: [shiho_1, shiho_2],
    },
  },
  {
    name: "MikuLeo",
    file: mikuLeo,
    group: "Leo/need",
  },
  {
    name: "Minori",
    file: minori,
    group: "MORE MORE JUMP!",
    sounds: {
      fall: [minori_1],
    },
  },
  {
    name: "Haruka",
    file: haruka,
    group: "MORE MORE JUMP!",
    sounds: {
      fall: [haruka_1],
    },
  },
  {
    name: "Airi",
    file: airi,
    group: "MORE MORE JUMP!",
    sounds: {
      fall: [airi_1, airi_2],
    },
  },
  {
    name: "Shizuku",
    file: shizuku,
    group: "MORE MORE JUMP!",
    sounds: {
      fall: [shizuku_1, shizuku_2],
    },
  },
  {
    name: "MikuMMJ",
    file: mikuMMJ,
    group: "MORE MORE JUMP!",
  },
  {
    name: "Kohane",
    file: kohane,
    group: "Vivid BAD SQUAD",
    sounds: {
      fall: [kohane_1, kohane_2],
    },
  },
  {
    name: "An",
    file: an,
    group: "Vivid BAD SQUAD",
    sounds: {
      fall: [an_1, an_2],
    },
  },
  {
    name: "Akito",
    file: akito,
    group: "Vivid BAD SQUAD",
    sounds: {
      fall: [akito_1, akito_2],
    },
  },
  {
    name: "Toya",
    file: toya,
    group: "Vivid BAD SQUAD",
    sounds: {
      fall: [toya_1, toya_2],
    },
  },
  {
    name: "MikuVBS",
    file: mikuVBS,
    group: "Vivid BAD SQUAD",
  },
  {
    name: "Tsukasa",
    file: tsukasa,
    group: "Wonderlands×Showtime",
    sounds: {
      fall: [tsukasa_1],
    },
  },
  {
    name: "Emu",
    file: emu,
    group: "Wonderlands×Showtime",
    sounds: {
      fall: [emu_1, emu_2, emu_3],
    },
  },
  {
    name: "Nene",
    file: nene,
    group: "Wonderlands×Showtime",
    sounds: {
      fall: [nene_1, nene_2],
    },
  },
  {
    name: "Rui",
    file: rui,
    group: "Wonderlands×Showtime",
    sounds: {
      fall: [rui_1, rui_2],
    },
  },
  {
    name: "NeneRobo",
    file: nenerobo,
    group: "Wonderlands×Showtime",
    preview: neneroboSmall,
  },
  {
    name: "Kanade",
    file: kanade,
    group: "25時",
    sounds: {
      fall: [kanade_1],
    },
  },
  {
    name: "Mafuyu",
    file: mafuyu,
    group: "25時",
    sounds: {
      fall: [mafuyu_1, mafuyu_2],
    },
  },
  {
    name: "Ena",
    file: ena,
    group: "25時",
    sounds: {
      fall: [ena_1],
    },
  },
  {
    name: "Mizuki",
    file: mizuki,
    group: "25時",
    sounds: {
      fall: [mizuki_1],
    },
  },
  {
    name: "Miku25ji",
    file: miku25ji,
    group: "25時",
  },
];
