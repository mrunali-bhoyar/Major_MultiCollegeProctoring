const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      processDir(filePath);
    } else if (filePath.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf-8');
      let changed = false;

      if (content.includes('useCollection') && !content.includes('useMemoFirebase')) {
        content = content.replace(/import \{.*?useCollection.*?\} from '@\/firebase';/g, match => {
            if (!match.includes('useMemoFirebase')) {
                return match.replace('useCollection', 'useCollection, useMemoFirebase');
            }
            return match;
        });
        changed = true;
      }

      const queryRegex = /const (\w+Query|\w+) = (firestore \? (?:query\(|collection\()[^;]+);/g;
      if (queryRegex.test(content)) {
        content = content.replace(queryRegex, 'const $1 = useMemoFirebase(() => $2, [firestore]);');
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${filePath}`);
      }
    }
  }
}

processDir('src/app');
