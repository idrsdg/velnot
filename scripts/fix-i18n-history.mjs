import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/i18n.ts';
let content = readFileSync(filePath, 'utf8');

const langs = [
  {
    search: `summary: 'Резюме', actions: 'Действия', transcript: 'Транскрипт',\n    },`,
    add: `summary: 'Резюме', actions: 'Действия', transcript: 'Транскрипт',
      open: 'Открыть', audioRecording: 'Аудиозапись', speakerTimeline: 'Хронология спикеров',
      speakers: (n: number) => \`Спикеры (\${n})\`,
      speakerHint: 'Введите имя → сохраните — все метки в транскрипте обновятся автоматически',
      speakerPlaceholder: (code: string) => \`Спикер \${code}...\`,
      speakerNames: 'Имена спикеров', speakerLabel: (code: string) => \`Спикер \${code}\`, namePlaceholder: 'Введите имя...',
      transcriptPlaceholder: 'Транскрипт появится здесь...', export: 'Экспорт', download: 'Скачать',
    },`,
    label: 'RU'
  },
  {
    search: `summary: '要約', actions: 'アクション', transcript: '文字起こし',\n    },`,
    add: `summary: '要約', actions: 'アクション', transcript: '文字起こし',
      open: '開く', audioRecording: '音声録音', speakerTimeline: '話者タイムライン',
      speakers: (n: number) => \`話者 (\${n})\`,
      speakerHint: '名前を入力 → 保存 — トランスクリプト内のすべてのラベルが自動更新されます',
      speakerPlaceholder: (code: string) => \`話者 \${code}...\`,
      speakerNames: '話者名', speakerLabel: (code: string) => \`話者 \${code}\`, namePlaceholder: '名前を入力...',
      transcriptPlaceholder: '文字起こしがここに表示されます...', export: 'エクスポート', download: 'ダウンロード',
    },`,
    label: 'JA'
  },
  {
    search: `summary: 'Ringkasan', actions: 'Tindakan', transcript: 'Transkrip',\n    },`,
    add: `summary: 'Ringkasan', actions: 'Tindakan', transcript: 'Transkrip',
      open: 'Buka', audioRecording: 'Rekaman Audio', speakerTimeline: 'Linimasa Pembicara',
      speakers: (n: number) => \`Pembicara (\${n})\`,
      speakerHint: 'Ketik nama → simpan — semua label dalam transkrip diperbarui otomatis',
      speakerPlaceholder: (code: string) => \`Pembicara \${code}...\`,
      speakerNames: 'Nama Pembicara', speakerLabel: (code: string) => \`Pembicara \${code}\`, namePlaceholder: 'Masukkan nama...',
      transcriptPlaceholder: 'Transkrip akan muncul di sini...', export: 'Ekspor', download: 'Unduh',
    },`,
    label: 'ID'
  },
  {
    search: `summary: '요약', actions: '작업', transcript: '전사',\n    },`,
    add: `summary: '요약', actions: '작업', transcript: '전사',
      open: '열기', audioRecording: '오디오 녹음', speakerTimeline: '발화자 타임라인',
      speakers: (n: number) => \`발화자 (\${n})\`,
      speakerHint: '이름 입력 → 저장 — 트랜스크립트의 모든 레이블이 자동 업데이트됩니다',
      speakerPlaceholder: (code: string) => \`발화자 \${code}...\`,
      speakerNames: '발화자 이름', speakerLabel: (code: string) => \`발화자 \${code}\`, namePlaceholder: '이름 입력...',
      transcriptPlaceholder: '트랜스크립트가 여기에 표시됩니다...', export: '내보내기', download: '다운로드',
    },`,
    label: 'KO'
  },
  {
    search: `summary: 'সারসংক্ষেপ', actions: 'কাজসমূহ', transcript: 'ট্রান্সক্রিপ্ট',\n    },`,
    add: `summary: 'সারসংক্ষেপ', actions: 'কাজসমূহ', transcript: 'ট্রান্সক্রিপ্ট',
      open: 'খুলুন', audioRecording: 'অডিও রেকর্ডিং', speakerTimeline: 'বক্তা টাইমলাইন',
      speakers: (n: number) => \`বক্তা (\${n})\`,
      speakerHint: 'নাম লিখুন → সেভ করুন — ট্রান্সক্রিপ্টের সব লেবল স্বয়ংক্রিয়ভাবে আপডেট হয়',
      speakerPlaceholder: (code: string) => \`বক্তা \${code}...\`,
      speakerNames: 'বক্তার নাম', speakerLabel: (code: string) => \`বক্তা \${code}\`, namePlaceholder: 'নাম লিখুন...',
      transcriptPlaceholder: 'ট্রান্সক্রিপ্ট এখানে দেখাবে...', export: 'রপ্তানি', download: 'ডাউনলোড',
    },`,
    label: 'BN'
  },
];

let count = 0;
for (const { search, add, label } of langs) {
  if (content.includes(search)) {
    content = content.replace(search, add);
    count++;
    console.log(`✅ ${label}`);
  } else {
    console.log(`❌ ${label} — not found`);
  }
}

writeFileSync(filePath, content, 'utf8');
console.log(`\nDone. ${count}/5 replacements made.`);
