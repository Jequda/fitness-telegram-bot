import { DayType, UserProfile, WellnessState, WorkoutBlock, WorkoutItem } from '../types/index.js';

function hasEquipment(profile: UserProfile, item: string) {
  return profile.equipment.includes(item as any);
}

function upperWorkout(profile: UserProfile): WorkoutItem[] {
  const items: WorkoutItem[] = [];

  if (hasEquipment(profile, 'pullup_bar')) items.push({ exerciseId: 'pullups', sets: '4 x 6–10' });
  else if (hasEquipment(profile, 'resistance_bands')) items.push({ exerciseId: 'band_row', sets: '4 x 12–20' });
  else items.push({ exerciseId: 'pushups', sets: '4 x 10–20' });

  if (hasEquipment(profile, 'dip_bars')) items.push({ exerciseId: 'dips', sets: '4 x 8–12' });
  else items.push({ exerciseId: 'incline_pushups', sets: '3 x 10–20' });

  if (hasEquipment(profile, 'dumbbells')) {
    items.push({ exerciseId: 'db_floor_press', sets: '3 x 8–12' });
    items.push({ exerciseId: 'db_row', sets: '4 x 10–12' });
    items.push({ exerciseId: 'db_overhead_press', sets: '3 x 8–12' });
  } else {
    items.push({ exerciseId: 'pike_pushups', sets: '3 x 6–12' });
  }

  return items;
}

function lowerWorkout(profile: UserProfile): WorkoutItem[] {
  const items: WorkoutItem[] = [];

  if (hasEquipment(profile, 'dumbbells')) {
    items.push({ exerciseId: 'goblet_squat', sets: '4 x 10–12' });
    items.push({ exerciseId: 'rdl', sets: '4 x 10–12' });
    items.push({ exerciseId: 'db_reverse_lunge', sets: '3 x 8–10 на ногу' });
  } else {
    items.push({ exerciseId: 'air_squats', sets: '3 x 15–20' });
    items.push({ exerciseId: 'reverse_lunge', sets: '3 x 10–12 на ногу' });
    items.push({ exerciseId: 'glute_bridge', sets: '3 x 12–20' });
  }

  items.push({ exerciseId: 'calf_raise', sets: '3 x 15–25' });
  return items;
}

function coreWorkout(profile: UserProfile): WorkoutItem[] {
  const items: WorkoutItem[] = [
    { exerciseId: 'plank', sets: '3 x 20–60 сек' },
    { exerciseId: 'side_plank', sets: '2 x 20–40 сек' },
    { exerciseId: 'dead_bug', sets: '3 x 8–12 на сторону' }
  ];
  if (hasEquipment(profile, 'pullup_bar')) items.unshift({ exerciseId: 'hanging_knee_raise', sets: '3 x 10–15' });
  return items;
}

function cardioAddOn(profile: UserProfile): WorkoutItem[] {
  if (profile.hasDailyCardio) {
    if (profile.cardioTypes.includes('bike') && hasEquipment(profile, 'stationary_bike')) {
      return [{ exerciseId: 'stationary_bike', sets: '15–25 минут' }];
    }
    if (profile.cardioTypes.includes('jump_rope') && hasEquipment(profile, 'jump_rope')) {
      return [{ exerciseId: 'jump_rope', sets: '5 x 60–90 сек' }];
    }
    return [{ exerciseId: 'walking', sets: '20–30 минут' }];
  }

  if (profile.goal === 'fat_loss' || profile.goal === 'endurance') {
    if (hasEquipment(profile, 'jump_rope')) return [{ exerciseId: 'jump_rope', sets: '5 x 60–90 сек' }];
    return [{ exerciseId: 'mountain_climbers', sets: '3 x 20–40 сек' }];
  }

  return [];
}

function workBlock(): WorkoutBlock {
  return {
    type: 'work',
    title: 'Блок на работе',
    summary: 'Короткая перезагрузка без клоунады и без пота на рубашке.',
    items: [
      { exerciseId: 'thoracic_stretch', sets: '2 x 30–40 сек' },
      { exerciseId: 'neck_mobility', sets: '6–8 на сторону' },
      { exerciseId: 'scapular_retraction', sets: '2 x 12–15' },
      { exerciseId: 'air_squats', sets: '2 x 15–20' },
      { exerciseId: 'box_breathing', sets: '4–6 циклов' },
      { exerciseId: 'hip_mobility', sets: '6–8 на сторону' }
    ]
  };
}

function minimumBlock(profile: UserProfile): WorkoutBlock {
  const items = [{ exerciseId: 'minimum_complex', sets: '2–3 круга' }, ...cardioAddOn(profile)];

  return {
    type: 'minimum',
    title: 'Минимум, но не ноль',
    summary: 'Когда сил мало, но режим бросать нельзя.',
    items
  };
}

function eveningStrength(dayType: DayType, profile: UserProfile): WorkoutBlock {
  const upper = upperWorkout(profile).slice(0, dayType === 'friday' ? 2 : 4);
  const core = coreWorkout(profile).slice(0, dayType === 'friday' ? 1 : 2);
  const finisher = cardioAddOn(profile).slice(0, dayType === 'friday' ? 0 : 1);

  return {
    type: 'evening',
    title: dayType === 'friday' ? 'Пятничная облегчённая тренировка' : 'Вечерняя домашняя тренировка',
    summary: dayType === 'friday' ? 'Без мясорубки. Поддерживаем ритм и оставляем силы.' : 'Персонализированный блок под цель, оборудование и объём времени.',
    items: [...upper, ...core, ...finisher]
  };
}

function weekendMain(profile: UserProfile): WorkoutBlock {
  const items = [...upperWorkout(profile).slice(0, 3), ...lowerWorkout(profile).slice(0, 3), ...coreWorkout(profile).slice(0, 2), ...cardioAddOn(profile).slice(0, 1)];
  return {
    type: 'weekend_main',
    title: 'Основная тренировка выходного дня',
    summary: 'Более длинная тренировка под домашнее оборудование и цель пользователя.',
    items
  };
}

export function buildBlocks(dayType: DayType, wellness: WellnessState, profile: UserProfile): WorkoutBlock[] {
  if (wellness === 'getting_sick') {
    return [workBlock()];
  }

  if (wellness === 'no_energy' || wellness === 'sleepy') {
    return dayType === 'weekend' ? [minimumBlock(profile)] : [workBlock(), minimumBlock(profile)];
  }

  if (wellness === 'tired' || wellness === 'sore') {
    return dayType === 'weekend' ? [minimumBlock(profile), workBlock()] : [workBlock(), minimumBlock(profile)];
  }

  if (dayType === 'weekend') {
    return [weekendMain(profile)];
  }

  return [workBlock(), eveningStrength(dayType, profile)];
}
