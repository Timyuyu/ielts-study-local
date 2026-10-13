# 裁剪 ECDICT 生成离线核心词库 JSON
# 用法：
#   1. 下载 ECDICT 完整词库：
#      https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv
#   2. 准备每行一个单词的 words-from-app.txt
#   3. 运行：python -X utf8 scripts/build-dict.py ecdict.csv words-from-app.txt
# 输出：public/dict/ecdict.json（应用内置离线词典）
import argparse, csv, json, re, sys
from pathlib import Path

parser = argparse.ArgumentParser(description='从 ECDICT 生成离线核心词库')
parser.add_argument('csv_file')
parser.add_argument('app_words_file')
args = parser.parse_args()
SRC = args.csv_file
APP_WORDS = args.app_words_file
OUT = Path(__file__).resolve().parents[1] / 'public' / 'dict' / 'ecdict.json'

app_words = set()
with open(APP_WORDS, encoding='utf-8') as f:
    for line in f:
        w = line.strip().lower()
        if w:
            app_words.add(w)

TARGET = 50000
EXAM_TAGS = {'zk', 'gk', 'cet4', 'cet6', 'ky', 'toefl', 'ielts', 'gre'}
WORD_RE = re.compile(r"^[a-z][a-z'\-]*$")

must = set(app_words)
entries = []       # (score_key, dict)
stat = {'oxford': 0, 'ielts': 0, 'exam': 0, 'app': 0, 'collins': 0}

with open(SRC, encoding='utf-8') as f:
    r = csv.reader(f)
    next(r)
    for row in r:
        if not row:
            continue
        word = (row[0] or '').lower()
        if not WORD_RE.match(word) or len(word) > 24:
            continue
        trans = (row[3] or '').strip()
        if not trans:
            continue
        phonetic = (row[1] or '').strip()
        collins = (row[5] or '').strip()
        oxford = (row[6] or '').strip()
        tag = (row[7] or '').strip()
        frq = (row[9] or '').strip()
        bnc = (row[10] or '').strip()

        # 紧凑字段
        e = {}
        if phonetic:
            e['p'] = phonetic
        e['t'] = trans
        if collins:
            e['c'] = collins
        if oxford == '1':
            e['o'] = 1
        if tag:
            e['g'] = tag

        # 优先级分：0=必选(app/oxford/考试标签), 1=柯林斯, 2=词频
        is_must = word in must or oxford == '1' or any(t in EXAM_TAGS for t in tag.split())
        if is_must:
            entries.append((0, word, e))
            if word in must:
                stat['app'] += 1
            if oxford == '1':
                stat['oxford'] += 1
            if 'ielts' in tag.split():
                stat['ielts'] += 1
            if any(t in EXAM_TAGS for t in tag.split()):
                stat['exam'] += 1
        elif collins:
            entries.append((1, word, e))
            stat['collins'] += 1
        else:
            # 词频分：frq 优先
            score = 2
            if frq and frq.isdigit():
                score = 2 + max(0, 100 - int(frq) // 1000)  # frq 越小越靠前
            elif bnc and bnc.isdigit():
                score = 2 + max(0, 50 - int(bnc) // 10000)
            entries.append((score, word, e))

# 排序：必选在前，其余按分
entries.sort(key=lambda x: (x[0], x[1]))
# 去重（同一词可能重复出现？不会，csv 每词一行）
words = {}
n = 0
for score, word, e in entries:
    if n >= TARGET:
        break
    words[word] = e
    n += 1

result = {'v': 1, 'count': len(words), 'w': words}
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, separators=(',', ':'))

size = __import__('os').path.getsize(OUT)
print('词条数:', len(words))
print('统计:', stat)
print('文件大小: %.1f MB' % (size / 1048576))
