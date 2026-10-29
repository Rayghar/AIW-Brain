# The twelve-step scales, light and dark, by role (DESIGN.md §2 A). Step 1 card surface, 2 app background,
# 3 subtle background, 4 hover, 5 pressed/soft divider, 6 border, 7 strong border, 8 quiet solid, 9 solid (white text
# on it reaches 4.5:1 in both themes),
# 10 solid for white text, 11 coloured or secondary text, 12 primary text.
SCALES = {
 'sage':   {'light': ['#fdfdf9','#f6f6f0','#f0f1e9','#e9ece2','#e2e5dc','#d6dbd0','#c3cbbf','#a3aea2','#6a786d','#5d6d63','#4f5f55','#1b3a2e'],
            'dark':  ['#172024','#111719','#141b1e','#1d282d','#243035','#2b383e','#3a4a51','#4d5f66','#667970','#82948b','#a3b3aa','#e3ebe6']},
 'green':  {'light': ['#f4f8f3','#ebf2ea','#e3ece4','#d6e6dc','#c6dccc','#b0cdb8','#8fb59b','#5f8f70','#2f6b4f','#23573f','#23603f','#163b2a'],
            'dark':  ['#132019','#16261e','#1b3326','#203a2e','#24452f','#2b5239','#356548','#43805b','#32825d','#2c6e51','#7fd3a5','#cfe9da']},
 'gold':   {'light': ['#fdf9ef','#fbf3e1','#f8edd3','#f3e2bd','#ecd5a3','#e0c386','#ceaa63','#b8913f','#976d16','#86601a','#7f5300','#4f3505'],
            'dark':  ['#1f1a10','#261f12','#33291a','#3b3018','#45381c','#544424','#6b572c','#8a6f36','#996c00','#7a5c1e','#f0c674','#f7e2b4']},
 'red':    {'light': ['#fdf6f5','#fbefec','#fbe7e3','#f6d8d2','#efc5bd','#e5ada3','#d48a7f','#c16a5d','#b3392b','#a3352a','#9b2f24','#5e1d16'],
            'dark':  ['#1f1414','#2a1816','#3a201d','#452420','#522a25','#63322b','#7d3f36','#a14f43','#c44c40','#a8443a','#ff9b8c','#ffd6cf']},
 'blue':   {'light': ['#f6f9fd','#edf3fb','#e6eef8','#d6e3f4','#c4d6ee','#b8cbe6','#94b1da','#6b8fc4','#2f5f9e','#2a5590','#2a5590','#183660'],
            'dark':  ['#121a24','#15202d','#1c2b42','#20304a','#263a57','#2e4669','#36507a','#4a6a9c','#4c75b6','#3e65a3','#93bdfc','#d3e4ff']},
 'violet': {'light': ['#faf7fb','#f4eef6','#efe6f2','#e6d8ea','#dbc8e1','#ccb3d4','#b391be','#9a72a6','#7b4b8c','#6d3f7e','#6a3d7a','#3f2149'],
            'dark':  ['#1a1520','#201a27','#2a2134','#31263d','#3a2d48','#463656','#574370','#7a5d96','#8966a5','#77589a','#d6b4ef','#efe0fa']},
 'teal':   {'light': ['#f3f9f9','#e9f4f4','#dfeeef','#cfe5e7','#bcdadd','#a3cbcf','#7fb2b8','#4f9199','#1f6f79','#17606a','#155b64','#0b3a40'],
            'dark':  ['#121c1e','#152325','#1a2e31','#1e363a','#234046','#2a4c53','#33606a','#3f7b86','#327f8a','#2f6f7a','#7fd0db','#cdeef2']},
}
# Constants and the neutral solid that stays dark in both themes (a dark band, the coach, a tooltip).
EXTRA = {
 'on-solid':       ('#ffffff', '#ffffff'),
 'on-solid-muted': ('#dbe5de', '#dbe5de'),
 'sage-solid':     ('#1f2d27', '#0c1214'),
 'sage-solid-2':   ('#2c3d35', '#1a2428'),
 'shadow':         ('#1f3d2e', '#000000'),
}
