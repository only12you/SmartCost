#!/usr/bin/env python3
"""CoatCost 현장진단 학습 데이터(JSON) → 학습용 이미지/마스크 폴더 변환기

사용법:
    pip install pillow numpy
    python export_to_masks.py coat_dataset_2026-10-25.json -o dataset
    python export_to_masks.py coat_dataset_2026-10-25_verified.json -o dataset --verified-only

결과:
    dataset/images/<사진ID>.jpg            원본(최대 1024px)
    dataset/masks/<클래스>/<기록ID>.png    결함 마스크(0/255, 사진과 같은 크기)
    dataset/manifest.csv                   사진·클래스·면적비·등급·검수 여부 목록
    dataset/split.json                     현장 단위 train/val/test 분할(데이터 누수 방지)
"""
import argparse, base64, csv, io, json, os, random, re
import numpy as np
from PIL import Image


def unrle(s, n):
    m = np.zeros(n, dtype=np.uint8)
    p, cur = 0, 0
    for tok in s.split(','):
        c = int(tok, 36) if tok else 0
        if cur:
            m[p:min(n, p + c)] = 1
        p += c
        cur ^= 1
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('json_file')
    ap.add_argument('-o', '--out', default='dataset')
    ap.add_argument('--verified-only', action='store_true', help='사람이 수정·확정한 기록만 사용')
    ap.add_argument('--min-quality', type=int, default=2, help='사진 품질 등급 상한(0양호,1주의,2재촬영 권장). 기본 2=모두 허용, 1=재촬영 권장 제외')
    ap.add_argument('--seed', type=int, default=7)
    a = ap.parse_args()

    data = json.load(open(a.json_file, encoding='utf-8'))
    os.makedirs(os.path.join(a.out, 'images'), exist_ok=True)
    rows, sites, saved = [], {}, set()

    for r in data['records']:
        if a.verified_only and not r.get('verified'):
            continue
        q = r.get('quality') or {}
        if q and q.get('lv', 0) > a.min_quality:
            continue
        url = data['photos'].get(r['pid'])
        if not url:
            continue
        img_path = os.path.join(a.out, 'images', r['pid'] + '.jpg')
        if r['pid'] not in saved:
            img = Image.open(io.BytesIO(base64.b64decode(url.split(',', 1)[1]))).convert('RGB')
            img.save(img_path, quality=92)
            saved.add(r['pid'])
        W, H = Image.open(img_path).size
        g = r['mg']                                  # 분석 해상도(w,h)와 분석 영역(X0,Y0,rw,rh)
        local = unrle(r['final']['mk'], g['rw'] * g['rh']).reshape(g['rh'], g['rw'])
        full = np.zeros((g['h'], g['w']), dtype=np.uint8)
        full[g['Y0']:g['Y0'] + g['rh'], g['X0']:g['X0'] + g['rw']] = local
        mask = Image.fromarray(full * 255).resize((W, H), Image.NEAREST)
        mdir = os.path.join(a.out, 'masks', r['k'])
        os.makedirs(mdir, exist_ok=True)
        mname = re.sub(r'[^0-9A-Za-z_-]', '_', r['id']) + '.png'
        mask.save(os.path.join(mdir, mname))
        # 분석 영역 밖은 학습에서 제외하기 위한 영역 마스크
        reg = np.zeros((g['h'], g['w']), dtype=np.uint8)
        reg[g['Y0']:g['Y0'] + g['rh'], g['X0']:g['X0'] + g['rw']] = 255
        os.makedirs(os.path.join(a.out, 'regions'), exist_ok=True)
        Image.fromarray(reg).resize((W, H), Image.NEAREST).save(os.path.join(a.out, 'regions', mname))
        rows.append([r['pid'], r['k'], os.path.join('masks', r['k'], mname), r['final'].get('pct'), r['final'].get('g'),
                     int(bool(r.get('verified'))), (r.get('flags') or {}).get('corrected', False), r.get('name')])
        sites.setdefault(r.get('name') or r['pid'], set()).add(r['pid'])

    with open(os.path.join(a.out, 'manifest.csv'), 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f)
        w.writerow(['image_id', 'class', 'mask', 'area_pct', 'grade', 'verified', 'corrected', 'site'])
        w.writerows(rows)

    names = sorted(sites)
    random.Random(a.seed).shuffle(names)
    n = len(names)
    nt, nv = max(1, round(n * .15)) if n > 2 else 0, max(1, round(n * .15)) if n > 2 else 0
    split = {'test': names[:nt], 'val': names[nt:nt + nv], 'train': names[nt + nv:]} if n > 2 else {'train': names, 'val': [], 'test': []}
    json.dump({k: {s: sorted(sites[s]) for s in v} for k, v in split.items()}, open(os.path.join(a.out, 'split.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'변환 완료: 사진 {len(saved)}장, 마스크 {len(rows)}개, 현장 {n}곳 → {a.out}/')
    print('분할(현장 단위):', {k: len(v) for k, v in split.items()})


if __name__ == '__main__':
    main()
