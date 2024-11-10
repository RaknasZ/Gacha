import { world, system, WorldAfterEvents } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

world.afterEvents.itemUse.subscribe((eventData) => {
  const player = eventData.source;
  const item = eventData.itemStack;

  if (item.typeId === 'minecraft:diamond_sword') { // เปลี่ยนเป็น ID ไอเทมที่ต้องการ
    showGachaMenu(player);
  }
});

// อัตราการสุ่มไอเทมแต่ละระดับ
const rarityRates = {
  5: 0.6, // 5 ดาว
  4: 5.1, // 4 ดาว
  3: 94.3, // 3 ดาว
};

// ฟังก์ชันสำหรับสุ่มกาชา
function genshinGacha(
  player,
  pity4,
  pity5,
  garantee = false,
  guaranteedEventWeapon = false,
) {
  let roll = Math.random() * 100;
  let itemRarity;

  // ตรวจสอบการันตี 5 ดาว
  if (garantee || pity5 >= 90) {
    itemRarity = 5;
  } else if (pity5 >= 75) {
    roll = roll * (1 + (pity5 - 75) * 0.1);
  }

  // ตรวจสอบการันตี 4 ดาว
  if (pity4 >= 10) {
    itemRarity = 4;
  }

  // กำหนดระดับไอเทมตามอัตราการสุ่ม
  if (itemRarity === undefined) {
    if (roll <= rarityRates[5]) {
      itemRarity = 5;
    } else if (roll <= rarityRates[5] + rarityRates[4]) {
      itemRarity = 4;
    } else {
      itemRarity = 3;
    }
  }

  // อัพเดต Pity
  if (itemRarity === 5) {
    pity5 = 0;
    pity4 = 0;
  } else if (itemRarity === 4) {
    pity4 = 0;
    pity5++;
  } else {
    pity4++;
    pity5++;
  }

  // สุ่มอาวุธ
  let item;
  if (itemRarity === 5) {
    if (guaranteedEventWeapon) {
      // เลือกอาวุธอีเวนต์ (Netherite)
      item = "minecraft:netherite_sword";
    } else {
      // สุ่มอาวุธ 5 ดาว (Netherite)
      item = [
        "minecraft:netherite_sword",
        "minecraft:netherite_axe",
        "minecraft:netherite_pickaxe",
      ][Math.floor(Math.random() * 3)];
    }

    // เพิ่ม Enchantment สำหรับ 5 ดาว
    switch (item) {
      case "minecraft:netherite_sword":
        addEnchantment(player, "sharpness", 5);
        addEnchantment(player, "unbreaking", 3);
        break;
      case "minecraft:netherite_axe":
        addEnchantment(player, "efficiency", 5);
        addEnchantment(player, "unbreaking", 3);
        break;
      case "minecraft:netherite_pickaxe":
        addEnchantment(player, "fortune", 3);
        addEnchantment(player, "unbreaking", 3);
        break;
    }
  } else if (itemRarity === 4) {
    // สุ่มอาวุธ 4 ดาว (Diamond)
    item = [
      "minecraft:diamond_sword",
      "minecraft:diamond_axe",
      "minecraft:diamond_pickaxe",
    ][Math.floor(Math.random() * 3)];

    // เพิ่ม Enchantment สำหรับ 4 ดาว
    switch (item) {
      case "minecraft:diamond_sword":
        addEnchantment(player, "sharpness", 4);
        break;
      case "minecraft:diamond_axe":
        addEnchantment(player, "efficiency", 4);
        break;
      case "minecraft:diamond_pickaxe":
        addEnchantment(player, "fortune", 2);
        break;
    }
  } else {
    // สุ่มอาวุธ 3 ดาว
    item = [
      "minecraft:stone_sword",
      "minecraft:stone_axe",
      "minecraft:wooden_pickaxe",
    ][Math.floor(Math.random() * 3)];
  }

  return { itemRarity, item, pity4, pity5 };
}


// ฟังก์ชันสำหรับดึง Pity ของผู้เล่น
function getPity(player, objective) {
  try {
    return world.scoreboard
      .getObjective(objective)
      .getScore(player.nameTag);
  } catch (error) {
    console.error("Error getting pity:", error);
    return 0;
  }
}

// ฟังก์ชันสำหรับอัพเดต Pity ของผู้เล่น
function updatePity(player, objective, value) {
  player.runCommandAsync(`scoreboard players set @s c ${value}`);
}

// ฟังก์ชันสำหรับเพิ่ม Enchantment
function addEnchantment(player, enchantment, level) {
  world
    .getDimension("overworld")
    .runCommandAsync(
      `function gacha:add_enchantment ${player.nameTag} ${enchantment} ${level}`,
    );
}

function getPity(player, objective) {
  try {
    return world.scoreboard
      .getObjective(objective)
      .getScore(player.nameTag);
  } catch (error) {
    console.error("Error getting pity:", error);
    player.sendMessage("§cเกิดข้อผิดพลาดในการดึง Pity!"); // แจ้งเตือนผู้เล่น
    return 0; // หรือตั้งค่า Pity เริ่มต้น
  }
}

function getMoney(player) {
  try {
    const objective = world.scoreboard.getObjective("c");
    return objective.getScore(objective.getParticipants().find(p => p.displayName === player.nameTag));
  } catch (error) {
    return 0;
  }
}
// ฟังก์ชันสำหรับตรวจสอบเงิน
function checkBalance(player, amount) {
  const balance = getMoney(player)
  return balance >= amount;
}

// ฟังก์ชันสำหรับหักเงิน
function deductCoins(player, amount) {
  player
    .runCommandAsync(`scoreboard players remove @s c ${amount}`)
    .then(() => {
      // บังคับอัพเดตยอดเงิน
      const newBalance = getMoney(player); // เปลี่ยนเป็น getMoney
      player.runCommandAsync(`scoreboard players set @s c ${newBalance}`);
    });
}

// ฟังก์ชันสำหรับแสดง UI กาชา
function showGachaMenu(player) {
  new ActionFormData()
    .title("Gacha Menu")
    .body("เลือกจำนวนครั้งที่ต้องการสุ่ม")
    .button("สุ่ม 1 ครั้ง (100 Count)")
    .button("สุ่ม 10 ครั้ง (900 Count)")
    .show(player)
    .then((response) => {
      switch (response.selection) {
        case 0: // สุ่ม 1 ครั้ง
          if (checkBalance(player, 100)) {
            doGacha(player, 1);
            deductCoins(player, 100);
          } else {
            player.sendMessage("§cเงินไม่พอ!");
          }
          break;
        case 1: // สุ่ม 10 ครั้ง
          if (checkBalance(player, 900)) {
            doGacha(player, 10);
            deductCoins(player, 900);
          } else {
            player.sendMessage("§cเงินไม่พอ!");
          }
          break;
      }
    });
}

//ฟังก์ชันสำหรับทำกาชา
function doGacha(player, count) {
  const pity4 = getPity(player, "pity4");
  const pity5 = getPity(player, "pity5");

  for (let i = 0; i < count; i++) {
    const { itemRarity, item, newPity4, newPity5 } = genshinGacha(player, pity4, pity5);
    player.runCommandAsync(`give @s ${item}`);
    pity4 = newPity4; // อัพเดต Pity
    pity5 = newPity5; // อัพเดต Pity
    player.sendMessage(`§aคุณได้รับ ${item} (${itemRarity} ดาว)`);
  }

  updatePity(player, "pity4", pity4); // อัพเดต Pity ใน scoreboard
  updatePity(player, "pity5", pity5); // อัพเดต Pity ใน scoreboard
}


