export interface EventPost {
  id: string
  title: string
  date: string
  author: string
  text: string
  imageUrl?: string
  category: 'news' | 'announcement' | 'report'
}

export const events: EventPost[] = [
  {
    id: 'ev1',
    title: 'Обновлено расписание плей-офф',
    date: '2026-04-09',
    author: 'Администратор UFL',
    text: 'Публикуем обновленное расписание матчей плей-офф. Время начала двух встреч скорректировано по запросу арен.',
    category: 'announcement',
  },
  {
    id: 'ev2',
    title: 'Открыта аккредитация на финал',
    date: '2026-04-08',
    author: 'Медиа-центр',
    text: 'Прием заявок на медиа-аккредитацию открыт до 20 апреля. Подробные условия доступны в регламенте турнира.',
    category: 'news',
  },
  {
    id: 'ev3',
    title: 'Итоги недели: лучшие игроки тура',
    date: '2026-04-07',
    author: 'Редакция UFL',
    text: 'Подводим итоги недели и выделяем игроков, повлиявших на результаты матчей тура.',
    category: 'report',
  },
]
