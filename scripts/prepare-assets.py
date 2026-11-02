"""Copy user-provided originals and extract original PDF images without retouching."""
from pathlib import Path
import shutil
import pymupdf

root = Path(__file__).resolve().parents[2]
site = root / 'site'
for source in (root / 'Portfolio').glob('*.pdf'):
    key = 'pulsehealth' if 'PulseHealth' in source.name else 'tail-star-map'
    shutil.copyfile(source, site / 'assets/documents' / f'{key}.pdf')
    doc = pymupdf.open(source)
    targets = {2: ['pulse-pc', 'pulse-tablet', 'pulse-mobile']} if key == 'pulsehealth' else {6: ['tail-search-pdf', 'tail-mobile-pdf'], 7: ['tail-favorites-example']}
    for page_index, names in targets.items():
        for image_info, name in zip(doc[page_index].get_images(), names):
            original = doc.extract_image(image_info[0])
            (site / 'assets/projects' / f'{name}.{original["ext"]}').write_bytes(original['image'])
for source in (root / 'Portfolio').glob('*.jpg'):
    shutil.copyfile(source, site / 'assets/works/rtm/rtm-detail-full.jpg')
font_root = root / 'fonts/Pretendard-1.3.9'
shutil.copyfile(font_root / 'web/variable/woff2/PretendardVariable.woff2', site / 'assets/fonts/PretendardVariable.woff2')
shutil.copyfile(font_root / 'LICENSE.txt', site / 'assets/fonts/LICENSE.txt')
print('Copied original project PDFs, detail image, local font; extracted original PDF screenshots.')
