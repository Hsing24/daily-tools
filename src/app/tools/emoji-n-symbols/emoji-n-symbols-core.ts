export interface SymbolItem {
  readonly char: string;
  readonly name: string;
  readonly keywords: readonly string[];
  readonly category: string;
}

export const SYMBOL_CATEGORIES = [
  "表情/笑臉",
  "手勢/人物",
  "動物/自然",
  "食物",
  "物件/符號 emoji",
  "箭頭",
  "數學符號",
  "貨幣",
  "標點/排版",
  "框線/方塊字元",
  "希臘字母",
  "上下標",
] as const;

export type SymbolCategory = (typeof SYMBOL_CATEGORIES)[number];

export const ALL_SYMBOLS: readonly SymbolItem[] = [
  // 1. 表情/笑臉
  { char: "😀", name: "露齒笑臉", keywords: ["笑", "開心", "grinning", "happy", "smile"], category: "表情/笑臉" },
  { char: "😃", name: "大眼笑臉", keywords: ["大笑", "高興", "smiley", "happy"], category: "表情/笑臉" },
  { char: "😄", name: "瞇眼笑臉", keywords: ["歡笑", "愉快", "smile", "joyful"], category: "表情/笑臉" },
  { char: "😁", name: "嘻嘻笑臉", keywords: ["露齒", "得意", "grin", "laugh"], category: "表情/笑臉" },
  { char: "😆", name: "開懷大笑", keywords: ["閉眼大笑", "笑翻", "laughing", "lol"], category: "表情/笑臉" },
  { char: "😅", name: "流汗笑臉", keywords: ["尷尬", "捏把冷汗", "sweat_smile", "relief"], category: "表情/笑臉" },
  { char: "🤣", name: "笑倒在地", keywords: ["滾地大笑", "爆笑", "rofl", "rolling"], category: "表情/笑臉" },
  { char: "😂", name: "喜極而泣", keywords: ["笑哭", "哭笑不得", "joy", "tears"], category: "表情/笑臉" },
  { char: "🙂", name: "微微一笑", keywords: ["微笑", "禮貌微笑", "slightly_smiling_face"], category: "表情/笑臉" },
  { char: "🙃", name: "倒立笑臉", keywords: ["倒置", "無奈反諷", "upside_down"], category: "表情/笑臉" },
  { char: "😉", name: "眨眼", keywords: ["眨眼笑", "放電", "wink"], category: "表情/笑臉" },
  { char: "😊", name: "靦腆微笑", keywords: ["害羞", "溫暖", "blush", "happy"], category: "表情/笑臉" },
  { char: "😇", name: "天使光環", keywords: ["純潔", "乖巧", "innocent", "halo"], category: "表情/笑臉" },
  { char: "🥰", name: "愛心環繞", keywords: ["幸福", "被愛", "smiling_face_with_hearts", "love"], category: "表情/笑臉" },
  { char: "😍", name: "愛心眼睛", keywords: ["花痴", "喜歡", "heart_eyes", "love"], category: "表情/笑臉" },
  { char: "🤩", name: "崇拜星星眼", keywords: ["驚艷", "閃閃發亮", "star_struck"], category: "表情/笑臉" },
  { char: "😘", name: "飛吻", keywords: ["親親", "愛你", "kissing_heart", "kiss"], category: "表情/笑臉" },
  { char: "😋", name: "垂涎欲滴", keywords: ["好吃", "美味", "yum", "delicious"], category: "表情/笑臉" },
  { char: "😛", name: "吐舌笑臉", keywords: ["淘氣", "吐舌頭", "stuck_out_tongue"], category: "表情/笑臉" },
  { char: "😜", name: "眨眼吐舌", keywords: ["惡作劇", "鬼臉", "stuck_out_tongue_winking_eye"], category: "表情/笑臉" },
  { char: "🤪", name: "滑稽搞怪臉", keywords: ["發瘋", "搞怪", "zany_face", "crazy"], category: "表情/笑臉" },
  { char: "😝", name: "瞇眼吐舌", keywords: ["搞笑", "扮鬼臉", "stuck_out_tongue_closed_eyes"], category: "表情/笑臉" },
  { char: "🤫", name: "安靜噓聲", keywords: ["秘密", "不要說", "shushing_face", "quiet"], category: "表情/笑臉" },
  { char: "🤔", name: "沉思思考", keywords: ["想一想", "疑惑", "thinking"], category: "表情/笑臉" },
  { char: "🤐", name: "拉鍊閉嘴", keywords: ["保密", "沉默", "zipper_mouth"], category: "表情/笑臉" },
  { char: "🥱", name: "打哈欠", keywords: ["睏了", "無聊", "yawning_face", "tired"], category: "表情/笑臉" },
  { char: "😴", name: "沉睡做夢", keywords: ["睡覺", "晚安", "sleeping", "zzz"], category: "表情/笑臉" },
  { char: "😷", name: "戴口罩", keywords: ["生病", "感冒", "mask", "sick"], category: "表情/笑臉" },
  { char: "🥳", name: "派對慶祝", keywords: ["慶祝", "生日快樂", "partying_face", "celebration"], category: "表情/笑臉" },
  { char: "😎", name: "墨鏡酷臉", keywords: ["帥氣", "自信", "sunglasses", "cool"], category: "表情/笑臉" },

  // 2. 手勢/人物
  { char: "👍", name: "比讚頂好", keywords: ["讚", "好", "同意", "thumbsup", "like", "good"], category: "手勢/人物" },
  { char: "👎", name: "倒讚踩", keywords: ["差評", "反對", "thumbsdown", "dislike", "bad"], category: "手勢/人物" },
  { char: "👌", name: "OK 手勢", keywords: ["沒問題", "好的", "ok_hand", "perfect"], category: "手勢/人物" },
  { char: "✌️", name: "勝利手勢", keywords: ["耶", "剪刀手", "和平", "v", "victory", "peace"], category: "手勢/人物" },
  { char: "🤞", name: "祈求好運", keywords: ["交叉手指", "祝福", "crossed_fingers", "luck"], category: "手勢/人物" },
  { char: "🤟", name: "愛你手勢", keywords: ["愛你", "rock_love", "love_you_gesture"], category: "手勢/人物" },
  { char: "🤘", name: "搖滾手勢", keywords: ["金屬", "嗨起來", "metal", "rock"], category: "手勢/人物" },
  { char: "🤙", name: "打給我手勢", keywords: ["打電話", "酷", "call_me"], category: "手勢/人物" },
  { char: "👈", name: "向左指", keywords: ["手指左邊", "看左邊", "point_left"], category: "手勢/人物" },
  { char: "👉", name: "向右指", keywords: ["手指右邊", "看右邊", "point_right"], category: "手勢/人物" },
  { char: "👆", name: "向上指", keywords: ["看上方", "樓上", "point_up_2"], category: "手勢/人物" },
  { char: "👇", name: "向下指", keywords: ["看下方", "樓下", "point_down"], category: "手勢/人物" },
  { char: "☝️", name: "食指朝上", keywords: ["第一", "注意", "point_up"], category: "手勢/人物" },
  { char: "✋", name: "舉起手掌", keywords: ["暫停", "擊掌", "raised_hand", "stop"], category: "手勢/人物" },
  { char: "🤚", name: "手背朝前", keywords: ["立起手背", "raised_back_of_hand"], category: "手勢/人物" },
  { char: "🖐️", name: "張開五指", keywords: ["五指", "手掌", "raised_hand_with_fingers_splayed"], category: "手勢/人物" },
  { char: "🖖", name: "瓦肯舉手禮", keywords: ["生生不息", "星艦奇航", "vulcan_salute", "spock"], category: "手勢/人物" },
  { char: "👋", name: "揮手問候", keywords: ["再見", "你好", "打招呼", "wave", "hello", "bye"], category: "手勢/人物" },
  { char: "🤝", name: "握手合作", keywords: ["成交", "友好", "協議", "handshake", "deal"], category: "手勢/人物" },
  { char: "👏", name: "鼓掌拍手", keywords: ["拍手", "好棒", "clap", "applause"], category: "手勢/人物" },
  { char: "🙌", name: "高舉雙手", keywords: ["歡呼", "萬歲", "raised_hands", "hooray"], category: "手勢/人物" },
  { char: "👐", name: "張開雙手", keywords: ["擁抱", "接納", "open_hands"], category: "手勢/人物" },
  { char: "🤲", name: "雙手捧起", keywords: ["祈福", "接住", "palms_up_together"], category: "手勢/人物" },
  { char: "✍️", name: "執筆書寫", keywords: ["寫字", "簽名", "writing_hand", "write"], category: "手勢/人物" },
  { char: "🙏", name: "雙手合十", keywords: ["拜託", "祈禱", "感謝", "感恩", "pray", "thank_you"], category: "手勢/人物" },
  { char: "💪", name: "強壯二頭肌", keywords: ["肌肉", "加油", "力量", "muscle", "strong"], category: "手勢/人物" },
  { char: "🧑‍💻", name: "工程師開發者", keywords: ["寫程式", "碼農", "電腦", "technologist", "coder", "developer"], category: "手勢/人物" },
  { char: "🧙", name: "魔法師巫師", keywords: ["施法", "奇幻", "mage", "wizard"], category: "手勢/人物" },

  // 3. 動物/自然
  { char: "🐶", name: "小狗汪汪", keywords: ["狗", "寵物", "汪星人", "dog", "puppy"], category: "動物/自然" },
  { char: "🐱", name: "小貓喵喵", keywords: ["貓", "貓咪", "喵星人", "cat", "kitten"], category: "動物/自然" },
  { char: "🐭", name: "老鼠", keywords: ["鼠", "米老鼠", "mouse"], category: "動物/自然" },
  { char: "🐹", name: "倉鼠", keywords: ["黃金鼠", "鼠寶", "hamster"], category: "動物/自然" },
  { char: "🐰", name: "小白兔", keywords: ["兔子", "兔兔", "rabbit", "bunny"], category: "動物/自然" },
  { char: "🦊", name: "狐狸", keywords: ["狡猾", "赤狐", "fox"], category: "動物/自然" },
  { char: "🐻", name: "小熊", keywords: ["熊熊", "棕熊", "bear"], category: "動物/自然" },
  { char: "🐼", name: "熊貓貓熊", keywords: ["大熊貓", "竹子", "panda"], category: "動物/自然" },
  { char: "🐨", name: "無尾熊", keywords: ["樹袋熊", "尤加利樹", "koala"], category: "動物/自然" },
  { char: "🐯", name: "老虎", keywords: ["虎頭", "萬獸之王", "tiger"], category: "動物/自然" },
  { char: "🦁", name: "獅子", keywords: ["獅王", "草原", "lion"], category: "動物/自然" },
  { char: "🐮", name: "乳牛母牛", keywords: ["牛", "牛奶", "cow"], category: "動物/自然" },
  { char: "🐷", name: "小豬豬頭", keywords: ["豬", "粉紅豬", "pig"], category: "動物/自然" },
  { char: "🐸", name: "青蛙", keywords: ["蛤蟆", "池塘", "frog"], category: "動物/自然" },
  { char: "🐵", name: "猴子頭", keywords: ["大聖", "靈長類", "monkey"], category: "動物/自然" },
  { char: "🐧", name: "企鵝", keywords: ["南極", "企鵝寶寶", "penguin"], category: "動物/自然" },
  { char: "🐦", name: "小鳥飛鳥", keywords: ["鳥類", "羽毛", "bird"], category: "動物/自然" },
  { char: "🦅", name: "老鷹雄鷹", keywords: ["飛鷹", "猛禽", "eagle"], category: "動物/自然" },
  { char: "🦆", name: "鴨子", keywords: ["綠頭鴨", "黃色小鴨", "duck"], category: "動物/自然" },
  { char: "🦉", name: "貓頭鷹", keywords: ["夜行性", "智慧", "owl"], category: "動物/自然" },
  { char: "🐝", name: "蜜蜂", keywords: ["採蜜", "嗡嗡嗡", "bee", "honeybee"], category: "動物/自然" },
  { char: "🐛", name: "毛毛蟲", keywords: ["昆蟲", "蟲子", "bug", "caterpillar"], category: "動物/自然" },
  { char: "🦋", name: "蝴蝶", keywords: ["展翅", "彩蝶", "butterfly"], category: "動物/自然" },
  { char: "🌸", name: "櫻花粉花", keywords: ["春暖花開", "花朵", "cherry_blossom", "flower"], category: "動物/自然" },
  { char: "🌲", name: "常青松樹", keywords: ["森林", "松樹", "evergreen_tree", "pine"], category: "動物/自然" },
  { char: "🍀", name: "幸運四葉草", keywords: ["四葉草", "幸運草", "four_leaf_clover", "luck"], category: "動物/自然" },
  { char: "☀️", name: "太陽晴天", keywords: ["陽光", "晴朗", "sun", "sunny"], category: "動物/自然" },
  { char: "⭐", name: "金色星星", keywords: ["星光", "星號", "star"], category: "動物/自然" },
  { char: "🌈", name: "七色彩虹", keywords: ["彩虹", "希望", "rainbow"], category: "動物/自然" },
  { char: "⚡", name: "閃電電力", keywords: ["打雷", "快速", "高壓", "zap", "lightning"], category: "動物/自然" },

  // 4. 食物
  { char: "🍎", name: "紅蘋果", keywords: ["蘋果", "水果", "apple", "fruit"], category: "食物" },
  { char: "🍊", name: "橘子柑橘", keywords: ["柳橙", "柑橘", "tangerine", "orange"], category: "食物" },
  { char: "🍋", name: "黃檸檬", keywords: ["檸檬", "酸", "lemon"], category: "食物" },
  { char: "🍌", name: "黃香蕉", keywords: ["香蕉", "蕉", "banana"], category: "食物" },
  { char: "🍉", name: "紅西瓜", keywords: ["西瓜", "消暑", "watermelon"], category: "食物" },
  { char: "🍇", name: "紫葡萄", keywords: ["葡萄", "釀酒", "grapes"], category: "食物" },
  { char: "🍓", name: "紅草莓", keywords: ["草莓", "甜點", "strawberry"], category: "食物" },
  { char: "🍒", name: "紅櫻桃", keywords: ["櫻桃", "車厘子", "cherries"], category: "食物" },
  { char: "🍑", name: "粉水蜜桃", keywords: ["水蜜桃", "仙桃", "peach"], category: "食物" },
  { char: "🍍", name: "鳳梨菠蘿", keywords: ["鳳梨", "旺來", "pineapple"], category: "食物" },
  { char: "🥥", name: "椰子", keywords: ["椰汁", "熱帶", "coconut"], category: "食物" },
  { char: "🥑", name: "酪梨牛油果", keywords: ["鱷梨", "健康食物", "avocado"], category: "食物" },
  { char: "🍔", name: "美式漢堡", keywords: ["牛肉堡", "速食", "hamburger", "burger"], category: "食物" },
  { char: "🍟", name: "香脆薯條", keywords: ["炸薯條", "麥當勞", "fries", "chips"], category: "食物" },
  { char: "🍕", name: "義式披薩", keywords: ["比薩", "披薩片", "pizza"], category: "食物" },
  { char: "🌭", name: "美式熱狗", keywords: ["大亨堡", "熱狗麵包", "hotdog"], category: "食物" },
  { char: "🥪", name: "三明治", keywords: ["吐司", "三文治", "sandwich"], category: "食物" },
  { char: "🌮", name: "墨西哥塔可", keywords: ["捲餅", "taco"], category: "食物" },
  { char: "🍜", name: "日式拉麵", keywords: ["熱湯麵", "麵食", "ramen", "noodles"], category: "食物" },
  { char: "🍣", name: "生魚壽司", keywords: ["壽司", "握壽司", "sushi"], category: "食物" },
  { char: "🍱", name: "日式便當", keywords: ["便當", "九宮格", "bento"], category: "食物" },
  { char: "☕", name: "香醇咖啡", keywords: ["熱咖啡", "熱茶", "美式", "coffee", "tea", "drink"], category: "食物" },
  { char: "🍵", name: "綠茶抹茶", keywords: ["日式煎茶", "熱茶", "tea", "matcha"], category: "食物" },
  { char: "🍺", name: "清涼啤酒", keywords: ["生啤", "酒類", "beer", "drink"], category: "食物" },
  { char: "🍻", name: "乾杯舉杯", keywords: ["乾杯", "暢飲", "beers", "cheers"], category: "食物" },
  { char: "🧋", name: "珍珠奶茶", keywords: ["珍奶", "波霸", "手搖飲", "boba", "bubble_tea"], category: "食物" },
  { char: "🍩", name: "甜甜圈", keywords: ["甜圈", "圈圈餅", "doughnut", "donut"], category: "食物" },
  { char: "🍰", name: "切片蛋糕", keywords: ["草莓蛋糕", "生日蛋糕", "cake", "dessert"], category: "食物" },
  { char: "🍦", name: "霜淇淋冰淇淋", keywords: ["甜筒", "雪糕", "icecream"], category: "食物" },
  { char: "🍫", name: "巧克力磚", keywords: ["可可", "黑巧", "chocolate"], category: "食物" },

  // 5. 物件/符號 emoji
  { char: "💡", name: "燈泡靈感", keywords: ["點子", "想法", "明亮", "bulb", "idea", "light"], category: "物件/符號 emoji" },
  { char: "🔔", name: "鈴鐺通知", keywords: ["提醒", "鈴響", "bell", "notification"], category: "物件/符號 emoji" },
  { char: "🔑", name: "金色鑰匙", keywords: ["金鑰", "密碼", "解鎖", "key", "password"], category: "物件/符號 emoji" },
  { char: "🔒", name: "上鎖鎖頭", keywords: ["安全", "加密", "私密", "lock", "secure", "private"], category: "物件/符號 emoji" },
  { char: "🔓", name: "打開鎖頭", keywords: ["解鎖", "開放", "公開", "unlock", "open"], category: "物件/符號 emoji" },
  { char: "📦", name: "紙箱包裹", keywords: ["快遞", "紙盒", "貨物", "package", "box"], category: "物件/符號 emoji" },
  { char: "📌", name: "大頭圖釘", keywords: ["釘選", "置頂", "固定", "pushpin", "pin"], category: "物件/符號 emoji" },
  { char: "📍", name: "圓形圖釘", keywords: ["地標", "位置", "打卡", "round_pushpin", "location"], category: "物件/符號 emoji" },
  { char: "📎", name: "迴紋針", keywords: ["附件", "夾子", "檔案", "paperclip", "attachment"], category: "物件/符號 emoji" },
  { char: "✂️", name: "剪刀裁切", keywords: ["剪裁", "剪下", "scissors", "cut"], category: "物件/符號 emoji" },
  { char: "📐", name: "三角板直角規", keywords: ["量角器", "幾何", "triangular_ruler", "math"], category: "物件/符號 emoji" },
  { char: "📏", name: "直尺刻度尺", keywords: ["長度", "量測", "straight_ruler"], category: "物件/符號 emoji" },
  { char: "🔨", name: "鐵鎚鎚子", keywords: ["施工", "打釘", "hammer", "tool"], category: "物件/符號 emoji" },
  { char: "🔧", name: "扳手板手", keywords: ["修繕", "調整", "wrench", "fix"], category: "物件/符號 emoji" },
  { char: "⚙️", name: "機械齒輪", keywords: ["設定", "系統配置", "參數", "gear", "settings", "config"], category: "物件/符號 emoji" },
  { char: "💻", name: "筆記型電腦", keywords: ["電腦", "筆電", "工作", "laptop", "computer"], category: "物件/符號 emoji" },
  { char: "📱", name: "智慧型手機", keywords: ["手機", "移動裝置", "iphone", "mobile", "phone"], category: "物件/符號 emoji" },
  { char: "⌨️", name: "電腦鍵盤", keywords: ["打字", "鍵位", "輸入", "keyboard", "type"], category: "物件/符號 emoji" },
  { char: "🖱️", name: "電腦滑鼠", keywords: ["游標", "點擊", "mouse", "click"], category: "物件/符號 emoji" },
  { char: "🎮", name: "遊戲搖桿手把", keywords: ["打電動", "主機遊戲", "video_game", "controller"], category: "物件/符號 emoji" },
  { char: "🎯", name: "飛鏢靶心", keywords: ["目標", "精準命中", "dart", "target", "goal"], category: "物件/符號 emoji" },
  { char: "🎨", name: "繪畫調色盤", keywords: ["設計", "美工", "藝術", "art", "palette", "design"], category: "物件/符號 emoji" },
  { char: "🚀", name: "太空火箭", keywords: ["發射", "衝刺", "起飛", "rocket", "launch", "fast"], category: "物件/符號 emoji" },
  { char: "🛸", name: "外星飛碟", keywords: ["幽浮", "不明飛行物", "ufo", "flying_saucer"], category: "物件/符號 emoji" },
  { char: "⏳", name: "漏盡沙漏", keywords: ["倒數", "等待中", "計時", "hourglass", "time"], category: "物件/符號 emoji" },
  { char: "⏰", name: "響鈴鬧鐘", keywords: ["時間", "鬧鈴", "提醒", "alarm_clock", "clock"], category: "物件/符號 emoji" },
  { char: "💎", name: "閃亮鑽石", keywords: ["寶石", "珍貴", "奢華", "gem", "diamond"], category: "物件/符號 emoji" },
  { char: "🔮", name: "占卜水晶球", keywords: ["預測", "魔法", "超自然", "crystal_ball", "magic"], category: "物件/符號 emoji" },
  { char: "🏆", name: "金色獎盃", keywords: ["第一名", "冠軍", "勝利", "trophy", "winner", "cup"], category: "物件/符號 emoji" },
  { char: "❤️", name: "紅色愛心", keywords: ["喜歡", "喜愛", "愛意", "heart", "love", "like"], category: "物件/符號 emoji" },

  // 6. 箭頭
  { char: "←", name: "向左箭頭", keywords: ["左", "前一個", "arrow", "left"], category: "箭頭" },
  { char: "→", name: "向右箭頭", keywords: ["右", "下一步", "前進", "arrow", "right", "next"], category: "箭頭" },
  { char: "↑", name: "向上箭頭", keywords: ["上", "頂部", "arrow", "up"], category: "箭頭" },
  { char: "↓", name: "向下箭頭", keywords: ["下", "底部", "arrow", "down"], category: "箭頭" },
  { char: "↔", name: "水平雙向箭頭", keywords: ["左右", "水平", "horizontal", "arrow"], category: "箭頭" },
  { char: "↕", name: "垂直雙向箭頭", keywords: ["上下", "垂直", "vertical", "arrow"], category: "箭頭" },
  { char: "↖", name: "向左上方箭頭", keywords: ["西北", "斜上左", "nw", "arrow"], category: "箭頭" },
  { char: "↗", name: "向右上方箭頭", keywords: ["東北", "斜上右", "ne", "arrow"], category: "箭頭" },
  { char: "↘", name: "向右下方箭頭", keywords: ["東南", "斜下右", "se", "arrow"], category: "箭頭" },
  { char: "↙", name: "向左下方箭頭", keywords: ["西南", "斜下左", "sw", "arrow"], category: "箭頭" },
  { char: "↚", name: "帶斜線向左箭頭", keywords: ["禁止向左", "left_stroke", "arrow"], category: "箭頭" },
  { char: "↛", name: "帶斜線向右箭頭", keywords: ["禁止向右", "right_stroke", "arrow"], category: "箭頭" },
  { char: "↞", name: "雙頭向左箭頭", keywords: ["快退", "左雙箭頭", "fast_backward"], category: "箭頭" },
  { char: "↠", name: "雙頭向右箭頭", keywords: ["快進", "右雙箭頭", "fast_forward"], category: "箭頭" },
  { char: "↩", name: "帶鉤左轉箭頭", keywords: ["返回", "回車", "return", "hook_left"], category: "箭頭" },
  { char: "↪", name: "帶鉤右轉箭頭", keywords: ["轉向", "重定向", "hook_right"], category: "箭頭" },
  { char: "↵", name: "轉角向下換行箭頭", keywords: ["換行", "回車", "enter", "newline"], category: "箭頭" },
  { char: "↶", name: "逆時針圓弧箭頭", keywords: ["撤銷", "復原", "undo", "counterclockwise"], category: "箭頭" },
  { char: "↷", name: "順時針圓弧箭頭", keywords: ["重做", "再次", "redo", "clockwise"], category: "箭頭" },
  { char: "↺", name: "逆時針開放圓箭頭", keywords: ["逆向旋轉", "重新整理", "reload"], category: "箭頭" },
  { char: "↻", name: "順時針開放圓箭頭", keywords: ["順向旋轉", "更新", "refresh"], category: "箭頭" },
  { char: "➔", name: "粗黑向右箭頭", keywords: ["粗右箭頭", "heavy_right", "arrow"], category: "箭頭" },
  { char: "➜", name: "圓角向右粗箭頭", keywords: ["圓頭右箭頭", "round_arrow", "right"], category: "箭頭" },
  { char: "➤", name: "黑色箭頭尖端", keywords: ["右三角形箭頭", "arrowhead", "bullet"], category: "箭頭" },
  { char: "➥", name: "彎曲向右粗箭頭", keywords: ["曲線右箭頭", "curved_right"], category: "箭頭" },
  { char: "⬆", name: "黑色粗向上箭頭", keywords: ["粗上箭頭", "black_up_arrow"], category: "箭頭" },
  { char: "⬇", name: "黑色粗向下箭頭", keywords: ["粗下箭頭", "black_down_arrow"], category: "箭頭" },
  { char: "⬅", name: "黑色粗向左箭頭", keywords: ["粗左箭頭", "black_left_arrow"], category: "箭頭" },
  { char: "➡", name: "黑色粗向右箭頭", keywords: ["粗右箭頭", "black_right_arrow"], category: "箭頭" },
  { char: "⇒", name: "雙線向右箭頭", keywords: ["蘊含", "推論", "implies", "double_right", "arrow"], category: "箭頭" },

  // 7. 數學符號
  { char: "±", name: "正負號", keywords: ["加減", "正負", "plus_minus"], category: "數學符號" },
  { char: "×", name: "乘號", keywords: ["乘法", "乘以", "times", "multiply"], category: "數學符號" },
  { char: "÷", name: "除號", keywords: ["除法", "除以", "divide", "division"], category: "數學符號" },
  { char: "≠", name: "不等於號", keywords: ["不等", "不相等", "not_equal", "ne"], category: "數學符號" },
  { char: "≈", name: "約等於號", keywords: ["近似", "大約", "approx", "almost_equal"], category: "數學符號" },
  { char: "≡", name: "恆等於號", keywords: ["恆等", "全等", "equivalent", "identical"], category: "數學符號" },
  { char: "≤", name: "小於等於號", keywords: ["小於等於", "不超過", "less_than_or_equal", "lte"], category: "數學符號" },
  { char: "≥", name: "大於等於號", keywords: ["大於等於", "不少於", "greater_than_or_equal", "gte"], category: "數學符號" },
  { char: "≪", name: "遠小於號", keywords: ["遠小於", "much_less_than"], category: "數學符號" },
  { char: "≫", name: "遠大於號", keywords: ["遠大於", "much_greater_than"], category: "數學符號" },
  { char: "∓", name: "負正號", keywords: ["減加", "minus_or_plus"], category: "數學符號" },
  { char: "≅", name: "幾何全等號", keywords: ["全等", "congruent", "geom"], category: "數學符號" },
  { char: "⊂", name: "真子集", keywords: ["子集", "集合", "subset"], category: "數學符號" },
  { char: "⊃", name: "真超集", keywords: ["超集", "superset"], category: "數學符號" },
  { char: "⊆", name: "子集且等於", keywords: ["子集或相等", "subset_or_equal"], category: "數學符號" },
  { char: "⊇", name: "超集且等於", keywords: ["超集或相等", "superset_or_equal"], category: "數學符號" },
  { char: "∈", name: "屬於元素號", keywords: ["屬於", "集合元素", "element_of", "in"], category: "數學符號" },
  { char: "∉", name: "不屬於號", keywords: ["不屬於", "非元素", "not_in"], category: "數學符號" },
  { char: "∋", name: "包含成員號", keywords: ["包含成員", "contains_member"], category: "數學符號" },
  { char: "∩", name: "集合交集", keywords: ["交集", "intersection", "cap"], category: "數學符號" },
  { char: "∪", name: "集合聯集", keywords: ["聯集", "聯集並集", "union", "cup"], category: "數學符號" },
  { char: "∅", name: "空集合符號", keywords: ["空集", "empty_set", "null"], category: "數學符號" },
  { char: "∞", name: "無限大符號", keywords: ["無限", "無窮", "infinity", "infinite"], category: "數學符號" },
  { char: "∝", name: "正比符號", keywords: ["成正比", "proportional"], category: "數學符號" },
  { char: "√", name: "平方根根號", keywords: ["根號", "平方根", "sqrt", "square_root"], category: "數學符號" },
  { char: "∛", name: "立方根號", keywords: ["三次方根", "cube_root"], category: "數學符號" },
  { char: "∑", name: "加總級數總和", keywords: ["西格瑪", "總和", "summation", "sigma", "sum"], category: "數學符號" },
  { char: "∏", name: "乘積算子", keywords: ["乘積", "連乘", "product", "pi"], category: "數學符號" },
  { char: "∫", name: "微積分積分號", keywords: ["積分", "integral", "calculus"], category: "數學符號" },
  { char: "∬", name: "二重積分號", keywords: ["雙重積分", "double_integral"], category: "數學符號" },
  { char: "∂", name: "偏微分符號", keywords: ["偏導", "偏微分", "partial_differential", "del"], category: "數學符號" },
  { char: "∇", name: "梯度運算子", keywords: ["納布拉算子", "梯度", "nabla", "gradient"], category: "數學符號" },
  { char: "∴", name: "所以推論符號", keywords: ["因此", "所以", "therefore"], category: "數學符號" },
  { char: "∵", name: "因為理由符號", keywords: ["因為", "緣由", "because"], category: "數學符號" },
  { char: "∀", name: "全稱量詞（對所有）", keywords: ["對所有", "任意", "for_all", "universal"], category: "數學符號" },
  { char: "∃", name: "存在量詞", keywords: ["存在", "有一個", "there_exists", "existential"], category: "數學符號" },
  { char: "∠", name: "幾何角符號", keywords: ["角度", "角", "angle"], category: "數學符號" },
  { char: "⊥", name: "垂直正交符號", keywords: ["垂直", "正交", "perpendicular", "orthogonal"], category: "數學符號" },

  // 8. 貨幣
  { char: "$", name: "美元/美金符號", keywords: ["錢", "美元", "美金", "dollar", "usd"], category: "貨幣" },
  { char: "€", name: "歐元符號", keywords: ["歐盟", "歐幣", "euro", "eur"], category: "貨幣" },
  { char: "£", name: "英鎊符號", keywords: ["英國", "磅", "pound", "gbp"], category: "貨幣" },
  { char: "¥", name: "日圓/人民幣符號", keywords: ["日幣", "元", "yen", "yuan", "jpy", "cny"], category: "貨幣" },
  { char: "¢", name: "分幣分錢符號", keywords: ["美分", "cent"], category: "貨幣" },
  { char: "₩", name: "韓元符號", keywords: ["韓國", "韓幣", "won", "krw"], category: "貨幣" },
  { char: "₽", name: "俄羅斯盧布", keywords: ["俄國", "盧布", "ruble", "rub"], category: "貨幣" },
  { char: "₺", name: "土耳其里拉", keywords: ["里拉", "turkish_lira", "try"], category: "貨幣" },
  { char: "฿", name: "泰銖符號", keywords: ["泰國", "泰幣", "baht", "thb"], category: "貨幣" },
  { char: "₫", name: "越南盾符號", keywords: ["越南", "盾", "dong", "vnd"], category: "貨幣" },
  { char: "₴", name: "烏克蘭格里夫納", keywords: ["烏克蘭", "hryvnia", "uah"], category: "貨幣" },
  { char: "₦", name: "奈及利亞奈拉", keywords: ["奈拉", "naira", "ngn"], category: "貨幣" },
  { char: "₱", name: "菲律賓披索", keywords: ["披索", "peso", "php"], category: "貨幣" },
  { char: "₲", name: "巴拉圭瓜拉尼", keywords: ["瓜拉尼", "guarani", "pyg"], category: "貨幣" },
  { char: "₪", name: "以色列新謝克爾", keywords: ["謝克爾", "shekel", "ils"], category: "貨幣" },
  { char: "₡", name: "哥斯大黎加科朗", keywords: ["科朗", "colon", "crc"], category: "貨幣" },
  { char: "₵", name: "迦納塞地", keywords: ["塞地", "cedi", "ghs"], category: "貨幣" },
  { char: "₨", name: "印度盧比舊符號", keywords: ["盧比", "rupee", "inr"], category: "貨幣" },
  { char: "₭", name: "寮國基普", keywords: ["基普", "kip", "lak"], category: "貨幣" },
  { char: "₮", name: "蒙古圖格里克", keywords: ["圖格里克", "tugrik", "mnt"], category: "貨幣" },
  { char: "₸", name: "哈薩克堅戈", keywords: ["堅戈", "tenge", "kzt"], category: "貨幣" },
  { char: "₿", name: "比特幣符號", keywords: ["加密貨幣", "區塊鏈", "bitcoin", "btc", "crypto"], category: "貨幣" },

  // 9. 標點/排版
  { char: "—", name: "全形破折號", keywords: ["破折號", "連接線", "em_dash", "dash"], category: "標點/排版" },
  { char: "–", name: "半形連接號", keywords: ["短破折號", "en_dash"], category: "標點/排版" },
  { char: "…", name: "水平刪節號", keywords: ["省略號", "點點點", "ellipsis", "dots"], category: "標點/排版" },
  { char: "«", name: "左雙角引號", keywords: ["書名號", "引號", "left_guillemet", "quote"], category: "標點/排版" },
  { char: "»", name: "右雙角引號", keywords: ["書名號", "引號", "right_guillemet", "quote"], category: "標點/排版" },
  { char: "“", name: "左雙引號", keywords: ["雙引號", "開引號", "left_double_quote"], category: "標點/排版" },
  { char: "”", name: "右雙引號", keywords: ["雙引號", "閉引號", "right_double_quote"], category: "標點/排版" },
  { char: "‘", name: "左單引號", keywords: ["單引號", "開單引號", "left_single_quote"], category: "標點/排版" },
  { char: "’", name: "右單引號", keywords: ["單引號", "閉單引號", "撇號", "right_single_quote", "apostrophe"], category: "標點/排版" },
  { char: "「", name: "左角括號（中式單引號）", keywords: ["引號", "角括號", "corner_bracket_left"], category: "標點/排版" },
  { char: "」", name: "右角括號（中式單引號）", keywords: ["引號", "角括號", "corner_bracket_right"], category: "標點/排版" },
  { char: "『", name: "左雙角括號（中式雙引號）", keywords: ["雙引號", "雙角括號", "white_corner_bracket_left"], category: "標點/排版" },
  { char: "』", name: "右雙角括號（中式雙引號）", keywords: ["雙引號", "雙角括號", "white_corner_bracket_right"], category: "標點/排版" },
  { char: "【", name: "左黑頭括號", keywords: ["方括號", "黑括號", "lenticular_bracket_left"], category: "標點/排版" },
  { char: "】", name: "右黑頭括號", keywords: ["方括號", "黑括號", "lenticular_bracket_right"], category: "標點/排版" },
  { char: "《", name: "左雙書名號", keywords: ["書名號", "double_angle_bracket_left"], category: "標點/排版" },
  { char: "》", name: "右雙書名號", keywords: ["書名號", "double_angle_bracket_right"], category: "標點/排版" },
  { char: "〈", name: "左單書名號", keywords: ["篇名號", "單書名號", "single_angle_bracket_left"], category: "標點/排版" },
  { char: "〉", name: "右單書名號", keywords: ["篇名號", "單書名號", "single_angle_bracket_right"], category: "標點/排版" },
  { char: "•", name: "圓形項目清單符號", keywords: ["圓點", "項目符號", "bullet", "dot"], category: "標點/排版" },
  { char: "‣", name: "三角項目符號", keywords: ["三角形清單", "triangular_bullet"], category: "標點/排版" },
  { char: "¶", name: "段落分段符號", keywords: ["段落", "換段", "pilcrow", "paragraph"], category: "標點/排版" },
  { char: "§", name: "章節法規符號", keywords: ["法條", "分節", "章節", "section_sign"], category: "標點/排版" },
  { char: "※", name: "參考註記符號", keywords: ["米字號", "附註", "reference_mark", "kome"], category: "標點/排版" },
  { char: "‰", name: "千分比符號", keywords: ["千分之一", "per_mille"], category: "標點/排版" },
  { char: "‱", name: "萬分比基點符號", keywords: ["基點", "萬分率", "per_ten_thousand", "bps"], category: "標點/排版" },
  { char: "†", name: "短劍號註釋", keywords: ["十字劍號", "註釋", "dagger"], category: "標點/排版" },
  { char: "‡", name: "雙短劍號註釋", keywords: ["雙劍號", "註記", "double_dagger"], category: "標點/排版" },
  { char: "¡", name: "倒驚嘆號", keywords: ["西語驚嘆號", "inverted_exclamation"], category: "標點/排版" },
  { char: "¿", name: "倒問號", keywords: ["西語問號", "inverted_question"], category: "標點/排版" },
  { char: "©", name: "著作版權宣告符號", keywords: ["版權", "版權所有", "copyright"], category: "標點/排版" },
  { char: "®", name: "註冊商標符號", keywords: ["商標", "註冊標記", "registered"], category: "標點/排版" },
  { char: "™", name: "未註冊商標符號", keywords: ["商標符號", "trademark"], category: "標點/排版" },
  { char: "°", name: "度數溫標符號", keywords: ["度", "角度", "溫度", "degree"], category: "標點/排版" },
  { char: "№", name: "序號編號符號", keywords: ["號碼", "編號", "numero", "number"], category: "標點/排版" },

  // 10. 框線/方塊字元
  { char: "─", name: "單細水平線", keywords: ["水平線", "橫線", "box_horizontal"], category: "框線/方塊字元" },
  { char: "│", name: "單細垂直線", keywords: ["垂直線", "直線", "box_vertical"], category: "框線/方塊字元" },
  { char: "┌", name: "單細左上角框線", keywords: ["左上角", "box_down_right"], category: "框線/方塊字元" },
  { char: "┐", name: "單細右上角框線", keywords: ["右上角", "box_down_left"], category: "框線/方塊字元" },
  { char: "└", name: "單細左下角框線", keywords: ["左下角", "box_up_right"], category: "框線/方塊字元" },
  { char: "┘", name: "單細右下角框線", keywords: ["右下角", "box_up_left"], category: "框線/方塊字元" },
  { char: "├", name: "單細左側丁字線", keywords: ["左分岔", "左T字", "box_vertical_right"], category: "框線/方塊字元" },
  { char: "┤", name: "單細右側丁字線", keywords: ["右分岔", "右T字", "box_vertical_left"], category: "框線/方塊字元" },
  { char: "┬", name: "單細上方丁字線", keywords: ["上分岔", "上T字", "box_down_horizontal"], category: "框線/方塊字元" },
  { char: "┴", name: "單細下方丁字線", keywords: ["下分岔", "下T字", "box_up_horizontal"], category: "框線/方塊字元" },
  { char: "┼", name: "單細十字交叉線", keywords: ["十字線", "交叉", "box_cross"], category: "框線/方塊字元" },
  { char: "═", name: "雙線水平框線", keywords: ["雙橫線", "double_horizontal"], category: "框線/方塊字元" },
  { char: "║", name: "雙線垂直框線", keywords: ["雙直線", "double_vertical"], category: "框線/方塊字元" },
  { char: "╔", name: "雙線左上角框線", keywords: ["雙線左上", "double_down_right"], category: "框線/方塊字元" },
  { char: "╗", name: "雙線右上角框線", keywords: ["雙線右上", "double_down_left"], category: "框線/方塊字元" },
  { char: "╚", name: "雙線左下角框線", keywords: ["雙線左下", "double_up_right"], category: "框線/方塊字元" },
  { char: "╝", name: "雙線右下角框線", keywords: ["雙線右下", "double_up_left"], category: "框線/方塊字元" },
  { char: "╠", name: "雙線左側丁字線", keywords: ["雙線左T", "double_vertical_right"], category: "框線/方塊字元" },
  { char: "╣", name: "雙線右側丁字線", keywords: ["雙線右T", "double_vertical_left"], category: "框線/方塊字元" },
  { char: "╦", name: "雙線上方丁字線", keywords: ["雙線上T", "double_down_horizontal"], category: "框線/方塊字元" },
  { char: "╩", name: "雙線下方丁字線", keywords: ["雙線下T", "double_up_horizontal"], category: "框線/方塊字元" },
  { char: "╬", name: "雙線十字交叉線", keywords: ["雙線十字", "double_cross"], category: "框線/方塊字元" },
  { char: "█", name: "全黑實心方塊", keywords: ["全黑塊", "填滿方塊", "full_block"], category: "框線/方塊字元" },
  { char: "░", name: "淺色點陣陰影方塊", keywords: ["淺色網點", "light_shade"], category: "框線/方塊字元" },
  { char: "▒", name: "中色點陣陰影方塊", keywords: ["中度網點", "medium_shade"], category: "框線/方塊字元" },
  { char: "▓", name: "深色點陣陰影方塊", keywords: ["深色網點", "dark_shade"], category: "框線/方塊字元" },
  { char: "■", name: "黑色實心正方形", keywords: ["黑方塊", "正方形", "black_square"], category: "框線/方塊字元" },
  { char: "□", name: "白色空心正方形", keywords: ["白方塊", "空心方塊", "white_square"], category: "框線/方塊字元" },
  { char: "▲", name: "黑色實心正三角形", keywords: ["黑正三角", "向上三角", "black_up_triangle"], category: "框線/方塊字元" },
  { char: "▼", name: "黑色實心倒三角形", keywords: ["黑倒三角", "向下三角", "black_down_triangle"], category: "框線/方塊字元" },
  { char: "◆", name: "黑色實心菱形", keywords: ["黑菱形", "菱形", "black_diamond"], category: "框線/方塊字元" },
  { char: "◇", name: "白色空心菱形", keywords: ["白菱形", "空心菱形", "white_diamond"], category: "框線/方塊字元" },

  // 11. 希臘字母
  { char: "α", name: "Alpha 小寫希臘字母", keywords: ["alpha", "阿爾法", "變數"], category: "希臘字母" },
  { char: "β", name: "Beta 小寫希臘字母", keywords: ["beta", "貝塔", "測試"], category: "希臘字母" },
  { char: "γ", name: "Gamma 小寫希臘字母", keywords: ["gamma", "伽瑪", "射線"], category: "希臘字母" },
  { char: "δ", name: "Delta 小寫希臘字母", keywords: ["delta", "德爾塔", "差值"], category: "希臘字母" },
  { char: "ε", name: "Epsilon 小寫希臘字母", keywords: ["epsilon", "艾普西隆", "微小值"], category: "希臘字母" },
  { char: "ζ", name: "Zeta 小寫希臘字母", keywords: ["zeta", "澤塔"], category: "希臘字母" },
  { char: "η", name: "Eta 小寫希臘字母", keywords: ["eta", "伊塔", "效率"], category: "希臘字母" },
  { char: "θ", name: "Theta 小寫希臘字母", keywords: ["theta", "西塔", "角度"], category: "希臘字母" },
  { char: "ι", name: "Iota 小寫希臘字母", keywords: ["iota", "約塔"], category: "希臘字母" },
  { char: "κ", name: "Kappa 小寫希臘字母", keywords: ["kappa", "卡帕"], category: "希臘字母" },
  { char: "λ", name: "Lambda 小寫希臘字母", keywords: ["lambda", "拉姆達", "波長", "匿名函式"], category: "希臘字母" },
  { char: "μ", name: "Mu 小寫希臘字母", keywords: ["mu", "微", "微米", "micro"], category: "希臘字母" },
  { char: "ν", name: "Nu 小寫希臘字母", keywords: ["nu", "紐", "頻率"], category: "希臘字母" },
  { char: "ξ", name: "Xi 小寫希臘字母", keywords: ["xi", "克西"], category: "希臘字母" },
  { char: "ο", name: "Omicron 小寫希臘字母", keywords: ["omicron", "奧密克戎"], category: "希臘字母" },
  { char: "π", name: "Pi 小寫圓周率", keywords: ["pi", "派", "圓周率"], category: "希臘字母" },
  { char: "ρ", name: "Rho 小寫希臘字母", keywords: ["rho", "柔", "密度"], category: "希臘字母" },
  { char: "σ", name: "Sigma 小寫標準差", keywords: ["sigma", "西格瑪", "標準差"], category: "希臘字母" },
  { char: "τ", name: "Tau 小寫希臘字母", keywords: ["tau", "陶", "時間常數"], category: "希臘字母" },
  { char: "υ", name: "Upsilon 小寫希臘字母", keywords: ["upsilon", "宇普西隆"], category: "希臘字母" },
  { char: "φ", name: "Phi 小寫黃金分割", keywords: ["phi", "斐", "相位", "黃金比例"], category: "希臘字母" },
  { char: "χ", name: "Chi 小寫卡方", keywords: ["chi", "希", "卡方檢定"], category: "希臘字母" },
  { char: "ψ", name: "Psi 小寫希臘字母", keywords: ["psi", "普賽", "波函數"], category: "希臘字母" },
  { char: "ω", name: "Omega 小寫希臘字母", keywords: ["omega", "歐米茄", "角速度"], category: "希臘字母" },
  { char: "Α", name: "Alpha 大寫希臘字母", keywords: ["Alpha", "大寫阿爾法"], category: "希臘字母" },
  { char: "Β", name: "Beta 大寫希臘字母", keywords: ["Beta", "大寫貝塔"], category: "希臘字母" },
  { char: "Γ", name: "Gamma 大寫希臘字母", keywords: ["Gamma", "大寫伽瑪"], category: "希臘字母" },
  { char: "Δ", name: "Delta 大寫三角形變化量", keywords: ["Delta", "變化量", "三角形"], category: "希臘字母" },
  { char: "Θ", name: "Theta 大寫希臘字母", keywords: ["Theta", "大寫西塔"], category: "希臘字母" },
  { char: "Λ", name: "Lambda 大寫希臘字母", keywords: ["Lambda", "大寫拉姆達"], category: "希臘字母" },
  { char: "Ξ", name: "Xi 大寫希臘字母", keywords: ["Xi", "大寫克西"], category: "希臘字母" },
  { char: "Π", name: "Pi 大寫乘積符號", keywords: ["Pi", "大寫派"], category: "希臘字母" },
  { char: "Σ", name: "Sigma 大寫求和符號", keywords: ["Sigma", "大寫西格瑪"], category: "希臘字母" },
  { char: "Φ", name: "Phi 大寫希臘字母", keywords: ["Phi", "大寫斐", "通量"], category: "希臘字母" },
  { char: "Ψ", name: "Psi 大寫希臘字母", keywords: ["Psi", "大寫普賽"], category: "希臘字母" },
  { char: "Ω", name: "Omega 大寫歐姆電阻", keywords: ["Omega", "歐姆", "電阻", "ohm"], category: "希臘字母" },

  // 12. 上下標
  { char: "⁰", name: "上標數字 0", keywords: ["上標0", "superscript_0"], category: "上下標" },
  { char: "¹", name: "上標數字 1", keywords: ["上標1", "一次方", "superscript_1"], category: "上下標" },
  { char: "²", name: "上標數字 2（平方）", keywords: ["上標2", "平方", "二次方", "superscript_2", "square"], category: "上下標" },
  { char: "³", name: "上標數字 3（立方）", keywords: ["上標3", "立方", "三次方", "superscript_3", "cube"], category: "上下標" },
  { char: "⁴", name: "上標數字 4", keywords: ["上標4", "四次方", "superscript_4"], category: "上下標" },
  { char: "⁵", name: "上標數字 5", keywords: ["上標5", "superscript_5"], category: "上下標" },
  { char: "⁶", name: "上標數字 6", keywords: ["上標6", "superscript_6"], category: "上下標" },
  { char: "⁷", name: "上標數字 7", keywords: ["上標7", "superscript_7"], category: "上下標" },
  { char: "⁸", name: "上標數字 8", keywords: ["上標8", "superscript_8"], category: "上下標" },
  { char: "⁹", name: "上標數字 9", keywords: ["上標9", "superscript_9"], category: "上下標" },
  { char: "⁺", name: "上標加號", keywords: ["上標+", "正電荷", "superscript_plus"], category: "上下標" },
  { char: "⁻", name: "上標減號", keywords: ["上標-", "負電荷", "superscript_minus"], category: "上下標" },
  { char: "⁼", name: "上標等號", keywords: ["上標=", "superscript_equals"], category: "上下標" },
  { char: "⁽", name: "上標左括號", keywords: ["上標(", "superscript_left_paren"], category: "上下標" },
  { char: "⁾", name: "上標右括號", keywords: ["上標)", "superscript_right_paren"], category: "上下標" },
  { char: "ⁿ", name: "上標字母 n", keywords: ["上標n", "n次方", "superscript_n"], category: "上下標" },
  { char: "₀", name: "下標數字 0", keywords: ["下標0", "subscript_0"], category: "上下標" },
  { char: "₁", name: "下標數字 1", keywords: ["下標1", "subscript_1"], category: "上下標" },
  { char: "₂", name: "下標數字 2", keywords: ["下標2", "分子式", "subscript_2"], category: "上下標" },
  { char: "₃", name: "下標數字 3", keywords: ["下標3", "subscript_3"], category: "上下標" },
  { char: "₄", name: "下標數字 4", keywords: ["下標4", "subscript_4"], category: "上下標" },
  { char: "₅", name: "下標數字 5", keywords: ["下標5", "subscript_5"], category: "上下標" },
  { char: "₆", name: "下標數字 6", keywords: ["下標6", "subscript_6"], category: "上下標" },
  { char: "₇", name: "下標數字 7", keywords: ["下標7", "subscript_7"], category: "上下標" },
  { char: "₈", name: "下標數字 8", keywords: ["下標8", "subscript_8"], category: "上下標" },
  { char: "₉", name: "下標數字 9", keywords: ["下標9", "subscript_9"], category: "上下標" },
  { char: "₊", name: "下標加號", keywords: ["下標+", "subscript_plus"], category: "上下標" },
  { char: "₋", name: "下標減號", keywords: ["下標-", "subscript_minus"], category: "上下標" },
  { char: "₌", name: "下標等號", keywords: ["下標=", "subscript_equals"], category: "上下標" },
  { char: "₍", name: "下標左括號", keywords: ["下標(", "subscript_left_paren"], category: "上下標" },
  { char: "₎", name: "下標右括號", keywords: ["下標)", "subscript_right_paren"], category: "上下標" },
  { char: "ₐ", name: "下標字母 a", keywords: ["下標a", "subscript_a"], category: "上下標" },
  { char: "ₑ", name: "下標字母 e", keywords: ["下標e", "subscript_e"], category: "上下標" },
  { char: "ₒ", name: "下標字母 o", keywords: ["下標o", "subscript_o"], category: "上下標" },
  { char: "ₓ", name: "下標字母 x", keywords: ["下標x", "subscript_x"], category: "上下標" },
];

/**
 * 將字元轉為 Unicode 碼位表示（多碼位以空白分隔，如 U+270C U+FE0F）。
 */
export function toCodePoint(char: string): string {
  if (!char) return "";
  return Array.from(char)
    .map((c) => {
      const code = c.codePointAt(0);
      if (code === undefined) return "";
      return `U+${code.toString(16).toUpperCase().padStart(4, "0")}`;
    })
    .filter(Boolean)
    .join(" ");
}

/**
 * 將字元轉為十六進位 HTML Entity（如 &#x2192;）。
 */
export function toHtmlEntity(char: string): string {
  if (!char) return "";
  return Array.from(char)
    .map((c) => {
      const code = c.codePointAt(0);
      if (code === undefined) return "";
      return `&#x${code.toString(16).toUpperCase()};`;
    })
    .filter(Boolean)
    .join("");
}

/**
 * 檢查字元項目是否符合搜尋條件。
 */
export function matchesQuery(item: SymbolItem, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  if (item.char.toLowerCase().includes(query)) return true;
  if (item.name.toLowerCase().includes(query)) return true;
  if (item.keywords.some((k) => k.toLowerCase().includes(query))) return true;

  // 比對 Unicode 碼位：「U+2192」/「u+21」走前綴比對；純 16 進位需 ≥4 碼，
  // 避免「u」、「+」或「ab」這類短字串把整張表都撈出來。
  const hasPrefix = query.startsWith("u+");
  const hexQuery = hasPrefix ? query.slice(2) : query;
  if (/^[0-9a-f]+$/.test(hexQuery) && (hasPrefix || hexQuery.length >= 4)) {
    const codePoints = toCodePoint(item.char)
      .toLowerCase()
      .split(" ")
      .map((cp) => cp.slice(2));
    const unpadded = hexQuery.replace(/^0+(?=.)/, "");
    if (
      codePoints.some(
        (hex) =>
          hex.startsWith(hexQuery) ||
          hex.replace(/^0+(?=.)/, "").startsWith(unpadded)
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * 過濾符號清單。
 * 支援多載：filterSymbols(query, category) 或 filterSymbols(symbols, query, category)。
 */
export function filterSymbols(
  symbolsOrQuery: readonly SymbolItem[] | string,
  queryOrCategory?: string,
  maybeCategory?: string
): SymbolItem[] {
  let list: readonly SymbolItem[];
  let query: string;
  let category: string;

  if (typeof symbolsOrQuery === "string") {
    list = ALL_SYMBOLS;
    query = symbolsOrQuery;
    category = queryOrCategory ?? "全部";
  } else {
    list = symbolsOrQuery;
    query = queryOrCategory ?? "";
    category = maybeCategory ?? "全部";
  }

  return list.filter((item) => {
    if (category !== "全部" && item.category !== category) {
      return false;
    }
    return matchesQuery(item, query);
  });
}
