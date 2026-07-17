import ichika from "../assets/chara/ichika.png";
import saki from "../assets/chara/saki.png";
import honami from "../assets/chara/honami.png";
import shiho from "../assets/chara/shiho.png";
import mikuLeo from "../assets/chara/miku_leo.png";

import minori from "../assets/chara/minori.png";
import haruka from "../assets/chara/haruka.png";
import airi from "../assets/chara/airi.png";
import shizuku from "../assets/chara/shizuku.png";
import mikuMMJ from "../assets/chara/miku_mmj.png";

import kohane from "../assets/chara/kohane.png";
import an from "../assets/chara/an.png";
import akito from "../assets/chara/akito.png";
import toya from "../assets/chara/toya.png";
import mikuVBS from "../assets/chara/miku_vbs.png";

import tsukasa from "../assets/chara/tsukasa.png";
import emu from "../assets/chara/emu.png";
import nene from "../assets/chara/nene.png";
import rui from "../assets/chara/rui.png";
import nenerobo from "../assets/chara/nenerobo.png";
import neneroboSmall from "../assets/chara/nenerobo_small.png";
import mikuWxS from "../assets/chara/miku_wxs.png";

import kanade from "../assets/chara/kanade.png";
import mafuyu from "../assets/chara/mafuyu.png";
import ena from "../assets/chara/ena.png";
import mizuki from "../assets/chara/mizuki.png";
import miku25ji from "../assets/chara/miku_25ji.png";

import mikudayo from "../assets/chara/mikudayo.png";
import mikudayoSmall from "../assets/chara/mikudayo_small.png";

import ichika_1 from "../assets/sounds/chara/ichika_1.mp3";
import ichika_2 from "../assets/sounds/chara/ichika_2.mp3";
import saki_1 from "../assets/sounds/chara/saki_1.mp3";
import saki_2 from "../assets/sounds/chara/saki_2.mp3";
import honami_1 from "../assets/sounds/chara/honami_1.mp3";
import honami_2 from "../assets/sounds/chara/honami_2.mp3";
import shiho_1 from "../assets/sounds/chara/shiho_1.mp3";
import shiho_2 from "../assets/sounds/chara/shiho_2.mp3";

import minori_1 from "../assets/sounds/chara/minori_1.mp3";
import haruka_1 from "../assets/sounds/chara/haruka_1.mp3";
import airi_1 from "../assets/sounds/chara/airi_1.mp3";
import airi_2 from "../assets/sounds/chara/airi_2.mp3";
import shizuku_1 from "../assets/sounds/chara/shizuku_1.mp3";
import shizuku_2 from "../assets/sounds/chara/shizuku_2.mp3";

import kohane_1 from "../assets/sounds/chara/kohane_1.mp3";
import kohane_2 from "../assets/sounds/chara/kohane_2.mp3";
import an_1 from "../assets/sounds/chara/an_1.mp3";
import an_2 from "../assets/sounds/chara/an_2.mp3";
import akito_1 from "../assets/sounds/chara/akito_1.mp3";
import akito_2 from "../assets/sounds/chara/akito_2.mp3";
import toya_1 from "../assets/sounds/chara/toya_1.mp3";
import toya_2 from "../assets/sounds/chara/toya_2.mp3";

import tsukasa_1 from "../assets/sounds/chara/tsukasa_1.mp3";
import emu_1 from "../assets/sounds/chara/emu_1.mp3";
import emu_2 from "../assets/sounds/chara/emu_2.mp3";
import emu_3 from "../assets/sounds/chara/emu_3.mp3";
import nene_1 from "../assets/sounds/chara/nene_1.mp3";
import nene_2 from "../assets/sounds/chara/nene_2.mp3";
import rui_1 from "../assets/sounds/chara/rui_1.mp3";
import rui_2 from "../assets/sounds/chara/rui_2.mp3";

import kanade_1 from "../assets/sounds/chara/kanade_1.mp3";
import mafuyu_1 from "../assets/sounds/chara/mafuyu_1.mp3";
import mafuyu_2 from "../assets/sounds/chara/mafuyu_2.mp3";
import ena_1 from "../assets/sounds/chara/ena_1.mp3";
import mizuki_1 from "../assets/sounds/chara/mizuki_1.mp3";

import miku_leo_1 from "../assets/sounds/chara/miku_leo_1.mp3";
import miku_leo_2 from "../assets/sounds/chara/miku_leo_2.mp3";
import miku_mmj_1 from "../assets/sounds/chara/miku_mmj_1.mp3";
import miku_mmj_2 from "../assets/sounds/chara/miku_mmj_2.mp3";
import miku_vbs_1 from "../assets/sounds/chara/miku_vbs_1.mp3";
import miku_wxs_1 from "../assets/sounds/chara/miku_wxs_1.mp3";
import miku_25ji_1 from "../assets/sounds/chara/miku_25ji_1.mp3";

import nenerobo_1 from "../assets/sounds/chara/nenerobo_1.mp3";
import nenerobo_2 from "../assets/sounds/chara/nenerobo_2.mp3";
import nenerobo_3 from "../assets/sounds/chara/nenerobo_3.mp3";
import mikudayo_1 from "../assets/sounds/chara/mikudayo_1.mp3";

import bandSound from "../assets/sounds/band.mp3";
import idolSound from "../assets/sounds/idol.mp3";
import streetSound from "../assets/sounds/street.mp3";
import wonderSound from "../assets/sounds/wonder.mp3";
import nightSound from "../assets/sounds/night.mp3";
import type { CharacterName } from "./ids";
import type { GroupName } from "../settings/types";

export const groupSounds: Partial<Record<GroupName, string>> = {
  "Leo/need": bandSound,
  "MORE MORE JUMP!": idolSound,
  "Vivid BAD SQUAD": streetSound,
  "Wonderlands×Showtime": wonderSound,
  "25時、ナイトコードで。": nightSound,
};

export interface CharacterData {
  name: CharacterName;
  file: string;
  group: GroupName | "Special";
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
    sounds: {
      fall: [miku_leo_1, miku_leo_2],
    },
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
    sounds: {
      fall: [miku_mmj_1, miku_mmj_2],
    },
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
    sounds: {
      fall: [miku_vbs_1],
    },
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
    sounds: {
      fall: [nenerobo_1, nenerobo_2, nenerobo_3],
    },
  },
  {
    name: "MikuWxS",
    file: mikuWxS,
    group: "Wonderlands×Showtime",
    sounds: {
      fall: [miku_wxs_1],
    },
  },
  {
    name: "Kanade",
    file: kanade,
    group: "25時、ナイトコードで。",
    sounds: {
      fall: [kanade_1],
    },
  },
  {
    name: "Mafuyu",
    file: mafuyu,
    group: "25時、ナイトコードで。",
    sounds: {
      fall: [mafuyu_1, mafuyu_2],
    },
  },
  {
    name: "Ena",
    file: ena,
    group: "25時、ナイトコードで。",
    sounds: {
      fall: [ena_1],
    },
  },
  {
    name: "Mizuki",
    file: mizuki,
    group: "25時、ナイトコードで。",
    sounds: {
      fall: [mizuki_1],
    },
  },
  {
    name: "Miku25ji",
    file: miku25ji,
    group: "25時、ナイトコードで。",
    sounds: {
      fall: [miku_25ji_1],
    },
  },
  {
    name: "Mikudayo",
    file: mikudayo,
    group: "Special",
    preview: mikudayoSmall,
    sounds: {
      fall: [mikudayo_1],
    },
  },
];
