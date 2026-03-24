from pathlib import Path
p=Path('src/courseData.js')
raw=p.read_text('utf-8')
converted=raw.encode('cp1251', errors='replace').decode('utf-8', errors='replace')
p.write_text(converted, 'utf-8')
