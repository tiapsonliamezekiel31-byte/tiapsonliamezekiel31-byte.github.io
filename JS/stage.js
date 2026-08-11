/**
 * NEMESIS ROGUELIKE — STAGE & LEVEL SYSTEM
 * Stage generation, level formations, boss encounters
 */

const FORMATIONS = {
  "1": {
    "A": {
      "1": {
        "enemies": [
          {
            "name": "Ash Ninja",
            "count": "3-4"
          },
          {
            "name": "Cinder Shinobi",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Ember Assassin",
            "count": "3-4"
          },
          {
            "name": "Magma Kunoichi",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Obsidian Rogue",
            "count": "2-3"
          },
          {
            "name": "Pyro Master",
            "count": "2"
          },
          {
            "name": "Scorch Saboteur",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Lava Ronin",
            "count": "3"
          },
          {
            "name": "Smoke Stalker",
            "count": "2"
          },
          {
            "name": "Volcanic Shadow",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Ash Master"
      }
    },
    "B": {
      "1": {
        "enemies": [
          {
            "name": "Cinder Shinobi",
            "count": "3-4"
          },
          {
            "name": "Ash Ninja",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Magma Kunoichi",
            "count": "3-4"
          },
          {
            "name": "Ember Assassin",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Pyro Master",
            "count": "2-3"
          },
          {
            "name": "Obsidian Rogue",
            "count": "2"
          },
          {
            "name": "Lava Ronin",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Smoke Stalker",
            "count": "3"
          },
          {
            "name": "Volcanic Shadow",
            "count": "2"
          },
          {
            "name": "Scorch Saboteur",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Lava Shinobi"
      }
    }
  },
  "2": {
    "A": {
      "1": {
        "enemies": [
          {
            "name": "Glyph Scholar",
            "count": "3-4"
          },
          {
            "name": "Sand Mage",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Tomb Oracle",
            "count": "3-4"
          },
          {
            "name": "Anubis Adept",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Sun Priest",
            "count": "2-3"
          },
          {
            "name": "Crypt Mystic",
            "count": "2"
          },
          {
            "name": "Scarab Invoker",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Desert Sage",
            "count": "3"
          },
          {
            "name": "Mirage Sorcerer",
            "count": "2"
          },
          {
            "name": "Sphinx Scholar",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Sun Priest"
      }
    },
    "B": {
      "1": {
        "enemies": [
          {
            "name": "Sand Mage",
            "count": "3-4"
          },
          {
            "name": "Glyph Scholar",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Anubis Adept",
            "count": "3-4"
          },
          {
            "name": "Tomb Oracle",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Crypt Mystic",
            "count": "2-3"
          },
          {
            "name": "Sun Priest",
            "count": "2"
          },
          {
            "name": "Desert Sage",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Mirage Sorcerer",
            "count": "3"
          },
          {
            "name": "Sphinx Scholar",
            "count": "2"
          },
          {
            "name": "Scarab Invoker",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Tomb Sentinel"
      }
    }
  },
  "3": {
    "A": {
      "1": {
        "enemies": [
          {
            "name": "Dune Legionnaire",
            "count": "3-4"
          },
          {
            "name": "Sand Strider",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Westward Shield",
            "count": "3-4"
          },
          {
            "name": "Desert Vanguard",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Marching Hoplite",
            "count": "2-3"
          },
          {
            "name": "Nomad Centurion",
            "count": "2"
          },
          {
            "name": "Sun Infantry",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Endless Walker",
            "count": "3"
          },
          {
            "name": "Empire Pioneer",
            "count": "2"
          },
          {
            "name": "Dust Phalanx",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Empire Warlord"
      }
    },
    "B": {
      "1": {
        "enemies": [
          {
            "name": "Sand Strider",
            "count": "3-4"
          },
          {
            "name": "Dune Legionnaire",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Desert Vanguard",
            "count": "3-4"
          },
          {
            "name": "Westward Shield",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Nomad Centurion",
            "count": "2-3"
          },
          {
            "name": "Marching Hoplite",
            "count": "2"
          },
          {
            "name": "Endless Walker",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Empire Pioneer",
            "count": "3"
          },
          {
            "name": "Dust Phalanx",
            "count": "2"
          },
          {
            "name": "Sun Infantry",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Nomad King"
      }
    }
  },
  "4": {
    "A": {
      "1": {
        "enemies": [
          {
            "name": "Void Cultist",
            "count": "3-4"
          },
          {
            "name": "Abyssal Mage",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Shadow Caster",
            "count": "3-4"
          },
          {
            "name": "Gloom Warlock",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Deep Summoner",
            "count": "2-3"
          },
          {
            "name": "Cave Occultist",
            "count": "2"
          },
          {
            "name": "Dark Adept",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Nether Seeker",
            "count": "3"
          },
          {
            "name": "Hollow Channeler",
            "count": "2"
          },
          {
            "name": "Abyss Priest",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Abyss Lord"
      }
    },
    "B": {
      "1": {
        "enemies": [
          {
            "name": "Abyssal Mage",
            "count": "3-4"
          },
          {
            "name": "Void Cultist",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Gloom Warlock",
            "count": "3-4"
          },
          {
            "name": "Shadow Caster",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Cave Occultist",
            "count": "2-3"
          },
          {
            "name": "Deep Summoner",
            "count": "2"
          },
          {
            "name": "Nether Seeker",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Hollow Channeler",
            "count": "3"
          },
          {
            "name": "Abyss Priest",
            "count": "2"
          },
          {
            "name": "Dark Adept",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Void Channeler"
      }
    }
  },
  "5": {
    "A": {
      "1": {
        "enemies": [
          {
            "name": "Destiny Knight",
            "count": "3-4"
          },
          {
            "name": "Oath Paladin",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Fate Vanguard",
            "count": "3-4"
          },
          {
            "name": "Order Templar",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Shield of Dawn",
            "count": "2-3"
          },
          {
            "name": "Royal Lancer",
            "count": "2"
          },
          {
            "name": "Divine Sentinel",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Sovereign Blade",
            "count": "3"
          },
          {
            "name": "Justice Bringer",
            "count": "2"
          },
          {
            "name": "Valor Champion",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Fate Sovereign"
      }
    },
    "B": {
      "1": {
        "enemies": [
          {
            "name": "Oath Paladin",
            "count": "3-4"
          },
          {
            "name": "Destiny Knight",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Order Templar",
            "count": "3-4"
          },
          {
            "name": "Fate Vanguard",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Royal Lancer",
            "count": "2-3"
          },
          {
            "name": "Shield of Dawn",
            "count": "2"
          },
          {
            "name": "Sovereign Blade",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Justice Bringer",
            "count": "3"
          },
          {
            "name": "Valor Champion",
            "count": "2"
          },
          {
            "name": "Divine Sentinel",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Dawn Sentinel"
      }
    }
  },
  "6": {
    "A": {
      "1": {
        "enemies": [
          {
            "name": "Restless Soul",
            "count": "3-4"
          },
          {
            "name": "Damned Spirit",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Purgatory Wraith",
            "count": "3-4"
          },
          {
            "name": "Escaping Phantom",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Lost Shade",
            "count": "2-3"
          },
          {
            "name": "Ascending Ghost",
            "count": "2"
          },
          {
            "name": "Bound Revenant",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Mournful Specter",
            "count": "3"
          },
          {
            "name": "Ethereal Wanderer",
            "count": "2"
          },
          {
            "name": "Tormented Soul",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Reaper"
      }
    },
    "B": {
      "1": {
        "enemies": [
          {
            "name": "Damned Spirit",
            "count": "3-4"
          },
          {
            "name": "Restless Soul",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Escaping Phantom",
            "count": "3-4"
          },
          {
            "name": "Purgatory Wraith",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Ascending Ghost",
            "count": "2-3"
          },
          {
            "name": "Lost Shade",
            "count": "2"
          },
          {
            "name": "Mournful Specter",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Ethereal Wanderer",
            "count": "3"
          },
          {
            "name": "Tormented Soul",
            "count": "2"
          },
          {
            "name": "Bound Revenant",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Damned General"
      }
    }
  },
  "7": {
    "A": {
      "1": {
        "enemies": [
          {
            "name": "Husk Acolyte",
            "count": "3-4"
          },
          {
            "name": "Parasitic Monk",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Infested Cleric",
            "count": "3-4"
          },
          {
            "name": "Soulless Priest",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Hollow Bishop",
            "count": "2-3"
          },
          {
            "name": "Fungal Templar",
            "count": "2"
          },
          {
            "name": "Spore Zealot",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Rotting Friar",
            "count": "3"
          },
          {
            "name": "Tainted Deacon",
            "count": "2"
          },
          {
            "name": "Blighted Vicar",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Rot Pontiff"
      }
    },
    "B": {
      "1": {
        "enemies": [
          {
            "name": "Parasitic Monk",
            "count": "3-4"
          },
          {
            "name": "Husk Acolyte",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Soulless Priest",
            "count": "3-4"
          },
          {
            "name": "Infested Cleric",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Fungal Templar",
            "count": "2-3"
          },
          {
            "name": "Hollow Bishop",
            "count": "2"
          },
          {
            "name": "Rotting Friar",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Tainted Deacon",
            "count": "3"
          },
          {
            "name": "Blighted Vicar",
            "count": "2"
          },
          {
            "name": "Spore Zealot",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Hollow Bishop"
      }
    }
  },
  "8": {
    "A": {
      "1": {
        "enemies": [
          {
            "name": "Plague Doctor",
            "count": "3-4"
          },
          {
            "name": "Mutated Subject",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Toxic Chemist",
            "count": "3-4"
          },
          {
            "name": "Viral Surgeon",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Rotted Scientist",
            "count": "2-3"
          },
          {
            "name": "Biohazard Brute",
            "count": "2"
          },
          {
            "name": "Pestilence Nurse",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Contaminated Medic",
            "count": "3"
          },
          {
            "name": "Fume Scholar",
            "count": "2"
          },
          {
            "name": "Blight Alchemist",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Toxic Behemoth"
      }
    },
    "B": {
      "1": {
        "enemies": [
          {
            "name": "Mutated Subject",
            "count": "3-4"
          },
          {
            "name": "Plague Doctor",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Viral Surgeon",
            "count": "3-4"
          },
          {
            "name": "Toxic Chemist",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Biohazard Brute",
            "count": "2-3"
          },
          {
            "name": "Rotted Scientist",
            "count": "2"
          },
          {
            "name": "Contaminated Medic",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Fume Scholar",
            "count": "3"
          },
          {
            "name": "Blight Alchemist",
            "count": "2"
          },
          {
            "name": "Pestilence Nurse",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Plague Master"
      }
    }
  },
  "9": {
    "A": {
      "1": {
        "enemies": [
          {
            "name": "Corrupt Disciple",
            "count": "3-4"
          },
          {
            "name": "Rot Believer",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Decay Zealot",
            "count": "3-4"
          },
          {
            "name": "Miasma Prophet",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Tainted Worshipper",
            "count": "2-3"
          },
          {
            "name": "Foul Oracle",
            "count": "2"
          },
          {
            "name": "Spoil Initiate",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Defiled Mystic",
            "count": "3"
          },
          {
            "name": "Ruin Chanter",
            "count": "2"
          },
          {
            "name": "Pestilent Fanatic",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Miasma Prophet"
      }
    },
    "B": {
      "1": {
        "enemies": [
          {
            "name": "Rot Believer",
            "count": "3-4"
          },
          {
            "name": "Corrupt Disciple",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Miasma Prophet",
            "count": "3-4"
          },
          {
            "name": "Decay Zealot",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Foul Oracle",
            "count": "2-3"
          },
          {
            "name": "Tainted Worshipper",
            "count": "2"
          },
          {
            "name": "Defiled Mystic",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Ruin Chanter",
            "count": "3"
          },
          {
            "name": "Pestilent Fanatic",
            "count": "2"
          },
          {
            "name": "Spoil Initiate",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Ruin Avatar"
      }
    }
  },
  "10": {
    "A": {
      "1": {
        "enemies": [
          {
            "name": "Scale Drake",
            "count": "3-4"
          },
          {
            "name": "Flame Wyrm",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Ember Dragon",
            "count": "3-4"
          },
          {
            "name": "Ash Hatchling",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Sky Serpent",
            "count": "2-3"
          },
          {
            "name": "Cinder Drake",
            "count": "2"
          },
          {
            "name": "Blaze Wyvern",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Soaring Behemoth",
            "count": "3"
          },
          {
            "name": "Inferno Dragon",
            "count": "2"
          },
          {
            "name": "Talon Scorch",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Fire Turtle"
      }
    },
    "B": {
      "1": {
        "enemies": [
          {
            "name": "Flame Wyrm",
            "count": "3-4"
          },
          {
            "name": "Scale Drake",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Ash Hatchling",
            "count": "3-4"
          },
          {
            "name": "Ember Dragon",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Cinder Drake",
            "count": "2-3"
          },
          {
            "name": "Sky Serpent",
            "count": "2"
          },
          {
            "name": "Soaring Behemoth",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Inferno Dragon",
            "count": "3"
          },
          {
            "name": "Talon Scorch",
            "count": "2"
          },
          {
            "name": "Blaze Wyvern",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Sky Terror"
      }
    }
  },
  "11": {
    "A": {
      "1": {
        "enemies": [
          {
            "name": "Depth Lurker",
            "count": "3-4"
          },
          {
            "name": "Trench Behemoth",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Deep Leviathan",
            "count": "3-4"
          },
          {
            "name": "Abyssal Terror",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Sea Goliath",
            "count": "2-3"
          },
          {
            "name": "Maelstrom Horror",
            "count": "2"
          },
          {
            "name": "Void Kraken",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Ocean Colossus",
            "count": "3"
          },
          {
            "name": "Tsunami Beast",
            "count": "2"
          },
          {
            "name": "Dark Tide",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Sea Behemoth",
        "special": "final"
      }
    },
    "B": {
      "1": {
        "enemies": [
          {
            "name": "Trench Behemoth",
            "count": "3-4"
          },
          {
            "name": "Depth Lurker",
            "count": "2"
          }
        ]
      },
      "2": {
        "enemies": [
          {
            "name": "Abyssal Terror",
            "count": "3-4"
          },
          {
            "name": "Deep Leviathan",
            "count": "1"
          }
        ]
      },
      "3": {
        "enemies": [
          {
            "name": "Maelstrom Horror",
            "count": "2-3"
          },
          {
            "name": "Sea Goliath",
            "count": "2"
          },
          {
            "name": "Ocean Colossus",
            "count": "1"
          }
        ]
      },
      "4": {
        "enemies": [
          {
            "name": "Tsunami Beast",
            "count": "3"
          },
          {
            "name": "Dark Tide",
            "count": "2"
          },
          {
            "name": "Void Kraken",
            "count": "1-2"
          }
        ]
      },
      "5": {
        "isBoss": true,
        "bossName": "Trench Leviathan",
        "special": "final"
      }
    }
  }
};

class StageManager {
  static syncUI() {
    if (typeof UIManager !== 'undefined') {
      // Prefer the centralized refresh path so all HUD elements (including
      // the central level indicator) are kept consistent when stage changes.
      if (typeof UIManager.refreshGameUI === 'function') {
        UIManager.refreshGameUI();
      } else {
        UIManager.renderEnemies();
        UIManager.updateWeaponIcons();
        UIManager.updateDateDisplay();
      }
    }
  }

  static getStageKey(stage, variant) {
    return `${stage}${variant || 'A'}`;
  }

  static ensureStageProgress() {
    const state = getGameState();
    if (!state.stageState) state.stageState = {};
    if (!state.stageState.stageProgress) {
      state.stageState.stageProgress = {};
    }
    const keys = ['1A','1B','2A','2B','3A','3B','4A','4B','5A','5B','6A','6B','7A','7B','8A','8B','9A','9B','10A','10B','11A','11B'];
    keys.forEach(k => {
      if (!state.stageState.stageProgress[k]) {
        state.stageState.stageProgress[k] = { maxCleared: 0, currentLevel: 1, isCleared: false };
      }
    });
  }

  static getStageProgress(stage, variant) {
    this.ensureStageProgress();
    const key = this.getStageKey(stage, variant);
    return getGameState().stageState.stageProgress[key];
  }

  static enterStageLevel(stage, variant, level, bossNameOverride = null) {
    const state = getGameState();
    this.ensureStageProgress();
    state.stageState.stage = Number(stage);
    state.stageState.stageVariation = variant || 'A';
    state.stageState.inActiveLevel = true;
    
    return this.generateLevel(Number(level), bossNameOverride);
  }

  static leaveToWorldMap() {
    const state = getGameState();
    state.stageState.inActiveLevel = false;
    state.stageState.enemies = [];
    this.syncUI();
  }

  static onLevelCleared() {
    const state = getGameState();
    const stage = state.stageState.stage;
    const variant = state.stageState.stageVariation;
    const level = state.stageState.level;

    this.ensureStageProgress();
    const prog = this.getStageProgress(stage, variant);
    if (prog) {
      prog.maxCleared = Math.max(prog.maxCleared || 0, level);
      if (level >= 5) {
        prog.isCleared = true;
      }
    }

    // Victory check: Stage 8 (Main Boss) or maxStages 
    const maxStg = state.config.maxStages || 11;
    if (stage >= maxStg && level >= 5) {
      return { isVictory: true };
    }

    return { isVictory: false, stage, variant, level };
  }

  static initializeRun(stage = 1) {
    const state = getGameState();
    
    state.stageState.stage = stage;
    state.stageState.level = 1;
    state.stageState.inActiveLevel = false;
    state.stageState.enemies = [];
    state.stageState.dodgeCount = 0;
    this.ensureStageProgress();

    state.systemState.dialogueSeen = {};
    state.systemState.runSeenEnemies = {};
    state.systemState.gameStartTime = Date.now();
    state.systemState.runCompletionHistory = [];
    state.systemState.runStats = {
      startClass: state.systemState.runStats?.startClass || state.playerState?.className || null,
      enemiesDefeated: 0,
      bossesSailed: 0,
      totalGoldEarned: 0,
      totalDiamondsEarned: 0,
      totalDamageTaken: 0,
      damageTakenCount: 0,
      last15DealtHits: [],
      buffsCollected: 0,
      tasksCompleted: 0,
      daysSurvived: 0
    };
    
    // Clear special event data for new run
    state.systemState.specialEvent = null;
    state.playerState.talismans = [];
    state.playerState.borrowedSkills = [];
    
    if (state.playerState.sacredTreeHpBonus) {
      state.playerState.maxHp = Math.max(state.config.baseMaxHp || 100, state.playerState.maxHp - state.playerState.sacredTreeHpBonus);
      state.playerState.hp = Math.min(state.playerState.hp, state.playerState.maxHp);
      state.playerState.sacredTreeHpBonus = 0;
    }
    if (state.playerState.sacredTreeManaBonus) {
      state.playerState.maxMana = Math.max(state.config.baseMaxMana || 50, state.playerState.maxMana - state.playerState.sacredTreeManaBonus);
      state.playerState.mana = Math.min(state.playerState.mana, state.playerState.maxMana);
      state.playerState.sacredTreeManaBonus = 0;
    }
    
    // Choose stage variation 
    state.stageState.stageVariation = this.pickStageVariation(stage);
    
    this.syncUI();
  }

  static generateLevel(level, bossNameOverride = null) {
    const state = getGameState();
    const stage = state.stageState.stage;
    const variation = state.stageState.stageVariation;
    
    state.stageState.level = level;
    state.stageState.enemies = [];
    state.stageState.daysOnLevel = 0;
    state.stageState.inActiveLevel = true;

    if (bossNameOverride) {
      this.generateBossLevel(bossNameOverride, 'miniboss');
      this.syncUI();
      return true;
    }
    
    const stageFormations = FORMATIONS[stage] || FORMATIONS[1];
    const variationData = stageFormations[variation] || stageFormations['A'] || Object.values(stageFormations)[0];
    const formationData = variationData ? variationData[level] : null;
    if (!formationData) {
      console.error(`No formation found for Stage ${stage} Var ${variation} Level ${level}`);
      return false;
    }
    
    if (formationData.isBoss) {
      this.generateBossLevel(formationData.bossName, formationData.special);
    } else {
      this.generateNormalLevel(formationData.enemies);
    }

    this.syncUI();
    
    return true;
  }
  
  static generateNormalLevel(enemyFormation) {
    const state = getGameState();
    const stage = state.stageState.stage;
    const variation = state.stageState.stageVariation;
    const level = state.stageState.level;
    
    if (typeof EnemyManager !== 'undefined' && EnemyManager.generateBudgetFormation) {
      state.stageState.enemies = EnemyManager.generateBudgetFormation(stage, variation, level);
    } else {
      state.stageState.enemies = [];
      enemyFormation.forEach(group => {
        const name = group.name;
        const countRange = group.count.split('-').map(Number);
        const count = countRange.length === 2
          ? Math.floor(Math.random() * (countRange[1] - countRange[0] + 1)) + countRange[0]
          : countRange[0];
        
        for (let i = 0; i < count; i++) {
          const enemy = EnemyManager.createEnemy(name, state.playerState.maxAp, stage);
          state.stageState.enemies.push(enemy);
        }
      });
    }
    
    // Adjust HP based on total enemy count
    state.stageState.enemies.forEach(enemy => {
      enemy.setEnemyCount(state.stageState.enemies.length);
    });
  }
  
  static generateBossLevel(bossName, special = null) {
    const state = getGameState();
    const stage = state.stageState.stage;
    const bossCfg = (state.config.bosses && state.config.bosses[bossName]) || {};
    const hpMultiplier = bossCfg.hpMult || this.getBossHpMultiplier(bossName);
    const calculatedHp = Math.round(state.playerState.maxAp * (2.0 + stage * 0.6) * hpMultiplier);
    
    state.stageState.enemies = [];
    state.stageState.bossData = {
      name: bossName,
      hp: calculatedHp,
      maxHp: calculatedHp,
      phase: 1,
      special: special,
      daysSurvived: 0
    };
    
    // Create a boss object with the minimal methods expected by combat code
    const bossObj = {
      id: 'boss',
      name: bossName,
      isBoss: true,
      hp: calculatedHp,
      maxHp: calculatedHp,
      isDead: false,
      dmgMult: 1.0,
      consecutiveAttackDays: 0,
      statusEffects: {},
      resist: bossCfg.resist || '-',
      weak: bossCfg.weak || '-',
      takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
          this.hp = 0;
          this.isDead = true;
        }
        if (state.stageState && state.stageState.bossData) {
          state.stageState.bossData.hp = this.hp;
          state.stageState.bossData.maxHp = this.maxHp;
          state.stageState.bossData.isDead = this.isDead;
        }
      },
      heal(amount) {
        if (this.statusEffects?.unstableConcoction?.preventHeal) {
          console.debug(`[Boss.heal] heal blocked by unstable concoction`);
          return;
        }
        this.hp = Math.min(this.maxHp, this.hp + amount);
      },
      getResistanceMultiplier(elementGrade) {
        const state = getGameState();
        if (!elementGrade || elementGrade === '-') return 1.0;
        const grade = elementGrade.trim().split(' ').pop();
        return state.config.elementGradeMultipliers[grade] || 1.0;
      },
      getWeaknessMultiplier(elementGrade) {
        return this.getResistanceMultiplier(elementGrade);
      }
    };

    state.stageState.enemies.push(bossObj);

    try {
      PopupsManager.showConfiguredDialogue('bossFirstSeen', {
        title: bossName,
        enemyName: bossName
      }, `bossFirstSeen:${bossName}`);
    } catch (e) {}

    this.syncUI();
  }
  
  static getBossHpMultiplier(bossName) {
    const multipliers = {
      'Demon': 1.0,
      'Mummified Marcher': 1.2,
      'Crimson Wizard': 0.8,
      'Worm Eater': 1.0,
      'Jade Giant': 1.3,
      'Star Computer': 0.9,
      'Angel': 1.0,
      'Killer Queen': 0.9,
      'Satan\'s Shark': 1.5,
      'Fire Turtle': 1.4,
      'Banished King': 1.2,
      'The Sun': 1.1,
      'Nemesis': 2.0
    };
    
    return multipliers[bossName] || 1.0;
  }
  
  static nextLevel() {
    const state = getGameState();
    
    if (state.stageState.level >= state.config.maxLevelPerStage) {
      // Stage complete
      return this.nextStage();
    }
    
    const nextLevel = state.stageState.level + 1;
    return this.generateLevel(nextLevel);
  }
  
  static nextStage() {
    const state = getGameState();
    
    if (state.stageState.stage >= state.config.maxStages) {
      // Game complete!
      state.eventBus.emit(EVENTS.VICTORY, {
        stage: state.stageState.stage,
        level: state.playerState.level
      });
      return false;
    }
    
    state.stageState.stage++;
    state.stageState.stageVariation = this.pickStageVariation(state.stageState.stage);
    state.stageState.stageClearedToday = true;
    state.stageState.dodgeCount = 0;
    
    // Resilience: gets +1 death defy every time move up a stage
    if (state.hasBuff('Resilience')) {
      if (!state.systemState.deathDefiance) {
        state.systemState.deathDefiance = { available: false, active: false, triggeredAt: null, charges: 0 };
      }
      if (state.systemState.deathDefiance.charges === undefined) {
        state.systemState.deathDefiance.charges = state.systemState.deathDefiance.available ? 1 : 0;
      }
      state.systemState.deathDefiance.charges++;
      state.systemState.deathDefiance.available = true;
      state.eventBus.emit(EVENTS.DEATH_DEFIANCE, {
        survived: false,
        hp: state.playerState.hp,
        available: state.systemState.deathDefiance.available,
        active: state.systemState.deathDefiance.active,
        triggeredAt: state.systemState.deathDefiance.triggeredAt,
        charges: state.systemState.deathDefiance.charges
      });
    }

    state.eventBus.emit(EVENTS.STAGE_COMPLETE, {
      stage: state.stageState.stage - 1,
      nextStage: state.stageState.stage
    });
    
    return this.generateLevel(1);
  }

  static pickStageVariation(stage) {
    // If the stage has only one variant (e.g., Stage 7), force 'A'
    const stageFormations = FORMATIONS[stage];
    if (stageFormations && !stageFormations.B) return 'A';
    return Math.random() < 0.5 ? 'A' : 'B';
  }
  
  static getAllEnemies() {
    return getGameState().stageState.enemies;
  }
  
  static getAliveEnemies() {
    return getGameState().stageState.enemies.filter(e => !e.isDead);
  }
  
  static allEnemiesDead() {
    return this.getAliveEnemies().length === 0;
  }
  
  static getEnemyById(id) {
    return getGameState().stageState.enemies.find(e => e.id === id);
  }

  static rehydrateLoadedEnemies() {
    const state = getGameState();

    state.stageState.enemies = (state.stageState.enemies || []).map(enemy => {
      if (!enemy) return enemy;

      // If already has methods, keep as-is
      if (typeof enemy.takeDamage === 'function') return enemy;

      // Rebuild boss objects (saved as plain data) with expected methods
      if (enemy.isBoss) {
        const bossName = enemy.name || (state.stageState.bossData && state.stageState.bossData.name) || 'Boss';
        const bossCfg = (state.config.bosses && state.config.bosses[bossName]) || {};
        const maxHpVal = Math.max(1, enemy.maxHp ?? (state.stageState.bossData && state.stageState.bossData.maxHp) ?? 1);
        const hpVal = enemy.isDead ? 0 : Math.max(1, enemy.hp ?? (state.stageState.bossData && state.stageState.bossData.hp) ?? 1);
        const bossObj = {
          id: enemy.id || 'boss',
          name: bossName,
          isBoss: true,
          hp: hpVal,
          maxHp: maxHpVal,
          isDead: !!enemy.isDead,
          dmgMult: (typeof enemy.dmgMult === 'number' ? enemy.dmgMult : 1.0),
          consecutiveAttackDays: enemy.consecutiveAttackDays || 0,
          statusEffects: enemy.statusEffects || {},
          resist: enemy.resist || bossCfg.resist || '-',
          weak: enemy.weak || bossCfg.weak || '-',
          takeDamage(amount) {
            this.hp -= amount;
            if (this.hp <= 0) { this.hp = 0; this.isDead = true; }
            if (state.stageState && state.stageState.bossData) {
              state.stageState.bossData.hp = this.hp;
              state.stageState.bossData.maxHp = this.maxHp;
              state.stageState.bossData.isDead = this.isDead;
            }
          },
          heal(amount) {
            if (this.statusEffects?.unstableConcoction?.preventHeal) {
              console.debug(`[Boss.heal] heal blocked by unstable concoction`);
              return;
            }
            this.hp = Math.min(this.maxHp, this.hp + amount);
          },
          getResistanceMultiplier(elementGrade) {
            const state = getGameState();
            if (!elementGrade || elementGrade === '-') return 1.0;
            const grade = elementGrade.trim().split(' ').pop();
            return state.config.elementGradeMultipliers[grade] || 1.0;
          },
          getWeaknessMultiplier(elementGrade) {
            return this.getResistanceMultiplier(elementGrade);
          }
        };

        return bossObj;
      }

      // Rebuild bomb objects
      if (enemy.isBomb) {
        const maxHpVal = Math.max(1, enemy.maxHp ?? 1);
        const hpVal = enemy.isDead ? 0 : Math.max(1, enemy.hp ?? 1);
        const bombObj = {
          id: enemy.id || ('bomb_' + Math.random().toString(36).substr(2, 9)),
          name: 'Bomb',
          isBoss: false,
          isBomb: true,
          hp: hpVal,
          maxHp: maxHpVal,
          isDead: !!enemy.isDead,
          dmgMult: 0.0,
          consecutiveAttackDays: 0,
          statusEffects: enemy.statusEffects || {},
          takeDamage(amount) {
            this.hp -= amount;
            if (this.hp <= 0) {
              this.hp = 0;
              this.isDead = true;
            }
          },
          heal(amount) {
            this.hp = Math.min(this.maxHp, this.hp + amount);
          },
          getResistanceMultiplier() { return 1.0; },
          getWeaknessMultiplier() { return 1.0; }
        };
        return bombObj;
      }

      // Rebuild regular enemies
      const rebuilt = EnemyManager.createEnemy(
        enemy.name,
        state.playerState.maxAp,
        state.stageState.stage || 1,
        !!enemy.isElite
      );

      rebuilt.id = enemy.id || rebuilt.id;
      // Preserve saved HP values if present; otherwise keep computed
      const maxHpVal = Math.max(1, (typeof enemy.maxHp === 'number') ? enemy.maxHp : rebuilt.maxHp);
      const hpVal = enemy.isDead ? 0 : Math.max(1, (typeof enemy.hp === 'number') ? enemy.hp : rebuilt.hp);
      rebuilt.maxHp = maxHpVal;
      rebuilt.hp = Math.min(hpVal, maxHpVal);
      rebuilt.isDead = !!enemy.isDead;
      rebuilt.consecutiveAttackDays = enemy.consecutiveAttackDays || 0;
      // Restore mutator state and days alive if saved
      rebuilt.mutators = Array.isArray(enemy.mutators) ? enemy.mutators.slice() : [];
      rebuilt.daysAlive = Number(enemy.daysAlive) || 0;
      return rebuilt;
    });



    this.syncUI();
  }
}
