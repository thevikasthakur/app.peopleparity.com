interface MessageContext {
  currentHour: number;
  dayOfWeek: number; // 0 = Sunday, 5 = Friday
  dayOfMonth: number;
  month: number;
  trackedHoursToday: number;
  trackedHoursWeek: number;
  lastActivityScore: number; // 0-10 scale
  isHolidayWeek: boolean;
  currentSessionMinutes: number;
  targetDailyHours: number;
  targetWeeklyHours: number;
  festivalsInWeek?: { name: string; date: string; isWeekend: boolean }[]; // Actual festivals from config
}

// Legacy hardcoded festivals - should be replaced by actual holiday config
// These are kept only as a fallback when festivalsInWeek is not provided
interface Festival {
  date: string; // MM-DD format
  name: string;
}

const festivals: Festival[] = [];

function getFestivalToday(month: number, day: number, festivalsInWeek?: { name: string; date: string; isWeekend: boolean }[]): string | null {
  // Use actual festival data if provided
  if (festivalsInWeek && festivalsInWeek.length > 0) {
    const todayStr = `${new Date().getFullYear()}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const festivalToday = festivalsInWeek.find(f => f.date === todayStr);
    return festivalToday?.name || null;
  }
  return null;
}

function getFestivalInWeek(festivalsInWeek?: { name: string; date: string; isWeekend: boolean }[]): { name: string; isWeekend: boolean } | null {
  // Use actual festival data from config if provided
  if (festivalsInWeek && festivalsInWeek.length > 0) {
    // Find first festival that's not on weekend
    const weekdayFestival = festivalsInWeek.find(f => !f.isWeekend);
    if (weekdayFestival) {
      return { name: weekdayFestival.name, isWeekend: false };
    }
    // If all festivals are on weekend, return first one
    if (festivalsInWeek.length > 0) {
      return { name: festivalsInWeek[0].name, isWeekend: true };
    }
  }
  return null;
}

function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getManagerMessage(context: MessageContext): string {
  const {
    currentHour,
    dayOfWeek,
    dayOfMonth,
    month,
    trackedHoursToday,
    trackedHoursWeek,
    lastActivityScore,
    isHolidayWeek,
    currentSessionMinutes,
    targetDailyHours = 8,
    targetWeeklyHours = 40,
    festivalsInWeek
  } = context;

  // Check for festival in the coming week (not on the day itself as it's a holiday)
  const festivalInfo = getFestivalInWeek(festivalsInWeek);
  const festivalInWeek = festivalInfo?.name || null;
  const festivalOnWeekend = festivalInfo?.isWeekend || false;
  const festivalToday = getFestivalToday(month, dayOfMonth, festivalsInWeek);

  console.log('📅 Manager Message Context:', {
    festivalsInWeek,
    festivalInWeek,
    festivalOnWeekend,
    festivalToday,
    isHolidayWeek,
    dayOfWeek,
    month,
    dayOfMonth
  });
  const isFriday = dayOfWeek === 5;
  const isMonday = dayOfWeek === 1;
  const isSalaryDay = dayOfMonth === 5;
  const isEndOfMonth = dayOfMonth >= 28;
  const remainingHoursToday = Math.max(0, targetDailyHours - trackedHoursToday);
  const remainingHoursWeek = Math.max(0, targetWeeklyHours - trackedHoursWeek);
  const dailyProgress = (trackedHoursToday / targetDailyHours) * 100;
  const weeklyProgress = (trackedHoursWeek / targetWeeklyHours) * 100;

  // Special day messages
  if (isSalaryDay) {
    const salaryMessages = [
      "Salary credited last night! But don't think you can slack off today, beta!",
      "Money in bank, but where is productivity on desk? Show me some real work!",
      "Money in bank? Good! Now earn it properly with 9 hours today!",
      "Salary day celebration? First complete your hours, then party!",
      "ATM visit done? Now visit your desk for full 9 hours!",
      "New month, fresh salary, same old expectations - 45 WORKING HOURS!"
    ];
    return getRandomMessage(salaryMessages);
  }

  // Show festival messages during the week before festival (not on festival day itself)
  // Also skip if festival falls on weekend (no holiday given)
  if (festivalInWeek && !festivalToday && !festivalOnWeekend) {
    const festivalMessages: Record<string, string[]> = {
      'Diwali': [
        `It's Diwali week! Your gift depends on this week's performance! 10.5h/day`,
        `Diwali week! Complete your 10.5h/day properly, festival shopping can wait!`,
        `Diwali preparations? First prepare your timesheet - need 45+ hours this week!`,
        `Festival of lights approaching! Light up your productivity first! 10.5h/day`,
        `Diwali week means EXTRA dedication! Show me 10.5+ hours daily!`
      ],
      'Holi': [
        `It's Holi Week! Complete your 10.5 hours per day before playing with colors!`,
        `It's Holi Week!! But first make your timesheet colorful with GREEN hours! 10.5h/day`,
        `Holi week! But productivity should not take holiday! 10.5h/day`,
        `Pre-Holi targets: 45 hours minimum! Then enjoy the colors!`,
        `Colors can wait, work cannot! Complete daily 10.5 hours first!`
      ],
      'Independence Day': [
        `Independence week! Show patriotism through productivity! 10.5h/day.`,
        `Tricolor week! Your timesheet should also have three colors: GREEN, GREEN, GREEN!`,
        `National holiday week, but work targets remain same! 45 hours`,
        `Freedom fighters worked hard for nation, you work hard for organization! 10.5h/day`,
        `Pre-holiday week means 10.5h/day! Compensate for upcoming holiday!`
      ],
      'Republic Day': [
        `Republic Week! India needs responsible people! Do 10.5h/day`,
        `26 January week! Complete your constitutional duty of 45 hours!`,
        `Parade practice? First practice completing 10.5 hours daily!`,
        `National holiday week = Extra working hours before holiday! 10.5h/day`
      ],
      'Christmas': [
        `Christmas week! Santa checking your timesheet, not just behavior! 10.5h/day`,
        `Holiday Week! But first let keyboard bells ring for 10.5 hours!`,
        `Christmas gifts depends on this week's performance! 10.5h/day`,
        `Pre-Christmas deadline! Complete all hours before holiday! 10.5h/day`
      ],
      'Gandhi Jayanti': [
        `Gandhi Jayanti week! Follow Bapu's principle: 'Work is Worship'! 10.5h/day`,
        `Non-violence week! But be violent with your keyboard - 10.5 hours daily!`,
        `Bapu's birthday coming! Honor him with honest 10.5h hours per daywork! `
      ],
      'default': [
        `${festivalInWeek} coming this week! Complete hours before celebration!`,
        `Festival week means extra dedication! Minimum 10.5 hours daily!`,
        `${festivalInWeek} approaching! Your bonus depends on this week's timesheet!`,
        `Pre-festival targets must be met! Show me 10.5 hours daily!`
      ]
    };
    const messages = festivalMessages[festivalInWeek] || festivalMessages['default'];
    return getRandomMessage(messages);
  }

  // Friday timesheet reminders
  if (isFriday) {
    if (remainingHoursWeek > 8) {
      return getRandomMessage([
        `FRIDAY ALERT! ${remainingHoursWeek.toFixed(1)} hours pending! Weekend plans CANCELLED if hours not complete!`,
        `Timesheet deadline TODAY! Missing ${remainingHoursWeek.toFixed(1)} hours. HR email draft ready!`,
        `Friday is here boss, but where are the ${remainingHoursWeek.toFixed(1)} hours? No timesheet, no weekend!`,
        `Last chance! Complete ${remainingHoursWeek.toFixed(1)} hours or Monday meeting with HR!`,
        `Timesheet submission in few hours! You're SHORT by ${remainingHoursWeek.toFixed(1)} hours!`
      ]);
    } else if (weeklyProgress > 90) {
      return getRandomMessage([
        "Good! Timesheet looking decent. Submit before 6 PM!",
        "Finally! Someone who understands Friday deadline. Complete and submit!",
        "Timesheet ready for submission. Don't forget to add comments!"
      ]);
    }
  }

  // Holiday week pressure
  if (isHolidayWeek && dayOfWeek < 5) {
    const dailyInHolidayWeek = targetWeeklyHours / 4; // Higher daily target
    if (trackedHoursToday < dailyInHolidayWeek - 2) {
      return getRandomMessage([
        `Holiday week! Need ${dailyInHolidayWeek} hours daily! You're behind!`,
        `One less working day this week! Compensate with ${dailyInHolidayWeek} hours today!`,
        `Holiday enjoyment depends on completing ${dailyInHolidayWeek} hours daily!`,
        `Short week, LONG hours required! Target: ${dailyInHolidayWeek} hours!`
      ]);
    }
  }

  // Time-based and activity-based messages
  if (currentHour >= 6 && currentHour < 9) {
    // Early morning
    if (lastActivityScore < 3) {
      return getRandomMessage([
        "Feeling sleepy in the early morning? Have some tea and START WORKING!",
        "Good morning! Or is it? Activity score telling different story!",
        "Early bird catches the worm, but you're catching sleep only!",
        "Finished your yoga? Good! Now do finger yoga on keyboard!",
        "Breakfast done? Feed some data to the system also!"
      ]);
    } else {
      return getRandomMessage([
        "Excellent morning start! Maintain this energy!",
        "Early morning productivity! I'm impressed (for once)!",
        "Good beginning! Don't spoil it after lunch!"
      ]);
    }
  } else if (currentHour >= 9 && currentHour < 12) {
    // Morning work hours
    if (trackedHoursToday < 1 && currentHour > 10) {
      return getRandomMessage([
        "It's already 11 AM! Not even 1 hour logged? Excuses ready?",
        "Half day gone, zero productivity shown! What's happening?",
        "Morning meeting missed because you were missing from desk?",
        "Client asking for update, what should I tell? You're on vacation?",
        "Tea break since morning? Stop the tea, start the work!"
      ]);
    } else if (lastActivityScore < 4) {
      return getRandomMessage([
        "What's going on? Focus on your work!",
        "Activity dropping! WhatsApp can wait till lunch!",
        "I can see activity score! Full Timepass?",
        "Low activity detected! Shall I inform the HR?",
        "Mouse moving but work not moving? Explain!"
      ]);
    }
  } else if (currentHour >= 12 && currentHour < 14) {
    // Lunch time
    if (currentHour === 13 && currentSessionMinutes > 30) {
      return getRandomMessage([
        "Lunch break over! Back to desk NOW!",
        "1 hour lunch break, not 2 hours gossip session!",
        "Food digested? Time to digest some work!",
        "Lunch done? Good! Dinner depends on afternoon productivity!"
      ]);
    } else if (trackedHoursToday < 3) {
      return getRandomMessage([
        "Half day, half work? Full salary expectation?",
        "Lunch break allowed ONLY after 4 hours work! Remember the rules?",
        "Empty stomach or empty timesheet? Both not acceptable!"
      ]);
    }
  } else if (currentHour >= 14 && currentHour < 17) {
    // Afternoon crucial hours
    if (lastActivityScore < 3) {
      return getRandomMessage([
        "Post-lunch laziness? Unacceptable! WAKE UP!",
        "Afternoon sleepiness is not a medical condition! WORK!",
        "Coffee break every 30 minutes? You're not in Europe!",
        "3 PM slump? Your salary doesn't slump! Neither should work!",
        "Siesta culture is in Spain, not in India!"
      ]);
    } else if (remainingHoursToday > 4 && currentHour > 15) {
      return getRandomMessage([
        `${remainingHoursToday.toFixed(1)} hours pending! Planning overnight shift?`,
        `Daily target missing by ${remainingHoursToday.toFixed(1)} hours! Explanation?`,
        `Client billing ${targetDailyHours} hours, you worked ${trackedHoursToday.toFixed(1)}! Who will fill the gap?`,
        `HR notification: ${remainingHoursToday.toFixed(1)} hours short! Salary deduction warning!`
      ]);
    }
  } else if (currentHour >= 17 && currentHour < 20) {
    // Evening - deadline approaching
    if (remainingHoursToday > 2) {
      return getRandomMessage([
        `Office time ending, ${remainingHoursToday.toFixed(1)} hours pending! OVERTIME MANDATORY!`,
        `${remainingHoursToday.toFixed(1)} hours short! Cancel evening plans!`,
        `Daily target FAIL! ${remainingHoursToday.toFixed(1)} hours missing. Stay back!`,
        `Going home? ${remainingHoursToday.toFixed(1)} hours says NO!`,
        `Shutdown blocked! Complete ${remainingHoursToday.toFixed(1)} hours first!`,
        `Family waiting? They can wait! ${remainingHoursToday.toFixed(1)} hours cannot!`
      ]);
    } else if (dailyProgress > 100) {
      return getRandomMessage([
        "Overtime today? Good! But don't expect comp-off!",
        "Extra hours noted! (But where were you yesterday?)",
        "Finally someone who understands targets! Keep going!"
      ]);
    }
  } else if (currentHour >= 20) {
    // Late evening
    if (trackedHoursToday < targetDailyHours) {
      return getRandomMessage([
        `Still ${remainingHoursToday.toFixed(1)} hours pending! Dinner can wait!`,
        `Late sitting finally? Should have started early morning!`,
        `Night shift? Good! Complete pending ${remainingHoursToday.toFixed(1)} hours!`,
        `Working late or just logged in late? Numbers don't lie!`
      ]);
    } else {
      return getRandomMessage([
        "Late night dedication! Tomorrow same energy expected!",
        "Burning midnight oil? Good! But come on time tomorrow!",
        "Finally target achieved! Was it so difficult?"
      ]);
    }
  }

  // Monday specific
  if (isMonday) {
    if (currentHour < 10 && trackedHoursToday === 0) {
      return getRandomMessage([
        "Monday blues? Your salary doesn't have blues!",
        "Weekend over! Vacation mode OFF, work mode ON!",
        "Monday morning meeting in 30 mins! Where are you?",
        "Didn't sleep on Sunday? Not working on Monday? What's the plan?"
      ]);
    }
  }

  // Low activity score warnings
  if (lastActivityScore < 2) {
    return getRandomMessage([
      "Activity score pathetic! Are you even breathing?",
      "Mouse auto-mover detected? Don't try smart tricks!",
      "Screen recording ON! Explain this low activity!",
      "Bot detection triggered! Manual verification required!",
      "Zero activity? Salary deduction calculation started!"
    ]);
  } else if (lastActivityScore < 5) {
    return getRandomMessage([
      "Mediocre performance! Client expects better!",
      "Average activity! Average appraisal coming!",
      "5/10 activity = 5/10 salary increment! Simple math!",
      "Improvement needed! Training session booking?"
    ]);
  } else if (lastActivityScore > 8) {
    return getRandomMessage([
      "Excellent activity! Maintain this tempo!",
      "Finally working like expected! Keep it up!",
      "Good score! (Don't get overconfident though)",
      "Impressive! Promotion material? Maybe... keep going!"
    ]);
  }

  // End of month pressure
  if (isEndOfMonth) {
    return getRandomMessage([
      "Month ending! Utilization report due! Show me numbers!",
      "Monthly target check! Every hour counts now!",
      "Month-end review tomorrow! Prepare your timesheet!",
      "Client billing cycle closing! Need all hours logged!"
    ]);
  }

  // Generic contextual messages based on daily progress
  if (dailyProgress < 25 && currentHour > 12) {
    return getRandomMessage([
      "Quarterly review coming! This performance will be highlighted!",
      "Team average 8 hours, yours? Shameful!",
      "Benchmark missing! Competency assessment triggered!",
      "Performance Improvement Plan (PIP) draft getting ready!",
      "Other teams laughing at our productivity! Thanks to you!"
    ]);
  } else if (dailyProgress >= 25 && dailyProgress < 50) {
    return getRandomMessage([
      "Halfway there! Don't slow down now!",
      "50% done! Another 50% before you think of leaving!",
      "Progress visible! But satisfaction level still low!",
      "Moving... but tortoise speed! Be the rabbit!"
    ]);
  } else if (dailyProgress >= 50 && dailyProgress < 75) {
    return getRandomMessage([
      "Good progress! But 'good' is enemy of 'great'!",
      "75% target approaching! Push harder!",
      "Almost there! Don't ruin it now!",
      "Decent work! But decent doesn't get promotion!"
    ]);
  } else if (dailyProgress >= 75 && dailyProgress < 100) {
    return getRandomMessage([
      "Final stretch! Complete it properly!",
      "Nearly done! Quality check pending though!",
      "Good going! Finish line visible!",
      "Target in sight! Don't celebrate yet!"
    ]);
  } else if (dailyProgress >= 100) {
    return getRandomMessage([
      "Target achieved! But consistency is key!",
      "Good job! Same expectation tomorrow!",
      "Finally! Was it really that difficult?",
      "Completed! But quality review pending!"
    ]);
  }

  // Default messages
  return getRandomMessage([
    "Working or pretending? Numbers will tell!",
    "Tracker is watching! HR is watching! I'M WATCHING!",
    "Every minute counts! Every hour matters! Every day decides appraisal!",
    "Client paying in dollars, you delivering in pennies?",
    "Productivity is not optional, it's mandatory!",
    "Your colleague already logged 6 hours! Where are you?",
    "Benchmark: 8 hours. Your score: Disappointing!",
    "Coffee breaks: 10, Productive hours: 0. Explain!",
    "LinkedIn job search or company work? Choose wisely!",
    "Appraisal form ready? Performance data also ready!"
  ]);
}

export function getWeeklyMarathonMessage(context: MessageContext): string {
  const { trackedHoursWeek, targetWeeklyHours = 40, dayOfWeek, festivalsInWeek } = context;
  const remainingHours = Math.max(0, targetWeeklyHours - trackedHoursWeek);
  const weeklyProgress = (trackedHoursWeek / targetWeeklyHours) * 100;
  // Calculate days remaining in work week (Mon-Fri)
  // dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
  const daysRemaining = dayOfWeek === 0 ? 5 : // Sunday: 5 days left
                        dayOfWeek === 6 ? 0 : // Saturday: 0 days left
                        Math.max(0, 5 - dayOfWeek); // Mon-Fri: normal calculation

  if (dayOfWeek === 5) {
    // Friday special
    if (remainingHours > 0) {
      return getRandomMessage([
        `FRIDAY PANIC! ${remainingHours.toFixed(1)} hours missing! Weekend plans = CANCELLED!`,
        `Timesheet submission TODAY! Short by ${remainingHours.toFixed(1)} hours! Ready for escalation?`,
        `Last day! ${remainingHours.toFixed(1)} hours pending! Overtime COMPULSORY!`
      ]);
    } else {
      return "Weekly target achieved! Submit timesheet before 6 PM! No excuses!";
    }
  }

  if (weeklyProgress < 20 && dayOfWeek > 2) {
    return getRandomMessage([
      `Only ${trackedHoursWeek.toFixed(1)}/${targetWeeklyHours} hours? Disaster incoming!`,
      `${remainingHours.toFixed(1)} hours in ${daysRemaining} days? Mission Impossible!`,
      `Weekly target slipping! Career also slipping!`
    ]);
  } else if (weeklyProgress >= 80) {
    return getRandomMessage([
      `Good pace! Maintain momentum! ${remainingHours.toFixed(1)} hours remaining!`,
      `Almost there! Don't slack off now! Complete ${targetWeeklyHours} hours!`
    ]);
  }

  return `${trackedHoursWeek.toFixed(1)}/${targetWeeklyHours} hours. ${remainingHours.toFixed(1)} pending. ${daysRemaining} days left. PRESSURE ON!`;
}

export function getCurrentSessionMessage(sessionMinutes: number, activityScore: number): string {
  if (sessionMinutes < 30) {
    return getRandomMessage([
      "Just started? Warm up fast! Client waiting!",
      "New session! Make it count! No time waste!",
      "Beginning noted! Performance monitoring ON!"
    ]);
  } else if (sessionMinutes > 240) {
    if (activityScore < 5) {
      return "4+ hours but low activity? Explain this magic!";
    }
    return "Long session! Take 5 min break! But ONLY 5 minutes!";
  } else if (activityScore < 3) {
    return getRandomMessage([
      "Activity dropping! Coffee needed or resignation?",
      "Low score detected! Shall I call your manager?",
      "Working or Netflix? Be honest!"
    ]);
  }

  return getRandomMessage([
    "Keep going! Every minute tracked!",
    "Session active! Productivity expected!",
    "Tracking on! Performance matters!"
  ]);
}