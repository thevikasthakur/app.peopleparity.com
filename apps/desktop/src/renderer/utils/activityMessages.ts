/**
 * Sarcastic activity-based messages for Today's Hustle and Weekly Marathon
 * Indian Manager Style - Appreciating, screaming, praising, threatening with emojis
 */

interface ActivityMessage {
  score: { min: number; max: number };
  hours: { min: number; max: number };
  messages: string[];
}

// Daily activity messages - 10 categories
export const dailyActivityMessages: ActivityMessage[] = [
  // SUPERSTAR: High activity (9-10), high hours (7+ hours)
  {
    score: { min: 9, max: 10 },
    hours: { min: 7, max: 24 },
    messages: [
      "🔥🔥 Arre waah! Client will be SO HAPPY! You are on FIRE today! But don't burnout ha, we need same performance tomorrow also! 💪",
      "👏 OUTSTANDING! This is what we call DEDICATION! Onsite opportunity pakka for you! Keep it up champion! 🏆",
      "🌟 Superb yaar! You're making entire team look good! Manager's manager also noticed your work today! Promotion loading... 📈",
      "💯 BRILLIANT performance! This is why we hired you! Other team members should learn from you! Bonus guaranteed! 🎯",
      "🚀 What a ROCKSTAR! Client specifically asked about you in today's call! You're our STAR performer! Keep shining! ⭐",
    ]
  },
  // EXCELLENT: High activity (8.5-9), high hours (6+ hours)
  {
    score: { min: 8.5, max: 9 },
    hours: { min: 6, max: 24 },
    messages: [
      "👍 Very good! Almost perfect day! Just little more push and you'll be in superstar category! Client is happy! 😊",
      "✨ Excellent work beta! Your dedication is showing in metrics! Manager is impressed! Appraisal me help milegi! 📊",
      "🎯 Great job! You're meeting all targets! This is the consistency we need! Keep maintaining this standard! 💪",
      "😎 Awesome performance! You're in top 10% today! Other teams are asking your secret! Share in standup tomorrow! 🌟",
      "🏅 Fantastic day! Quality AND quantity both achieved! This is what we call work-life balance! Well done! 👏",
    ]
  },
  // VERY GOOD: High activity (8.5-10), medium hours (4-6 hours)
  {
    score: { min: 8.5, max: 10 },
    hours: { min: 4, max: 6 },
    messages: [
      "⚡ Quality over quantity - PERFECT example! But thoda time aur doge to client khush ho jayega! 🎯",
      "💎 Excellent productivity! But only half day? Family function tha kya? Tomorrow full day expected! 😅",
      "🔥 Superb intensity! Par time kam hai boss! Stretch thoda, appraisal is coming! Rating depends on hours also! ⏰",
      "👌 High quality work! But competitors are putting more hours! Don't let them win! Tomorrow full day pakka? 💪",
      "🌟 Brilliant efficiency! But management wants to see more commitment! Visibility matter karta hai na! 📈",
    ]
  },
  // GOOD: Good activity (7-8.5), good hours (5+ hours)
  {
    score: { min: 7, max: 8.5 },
    hours: { min: 5, max: 24 },
    messages: [
      "👍 Good work! But I know you can do better! Remember your interview promises? Time to show that potential! 💪",
      "✅ Decent performance! But 'decent' doesn't get onsite! Push harder! Competition is tough this quarter! 🎯",
      "😊 Not bad! But client expects MORE from our team! Don't be satisfied with 'good enough'! Excellence chahiye! 🚀",
      "🎯 Fair job! But your colleague did better today! Healthy competition hai, but you should win na! 😤",
      "📈 Satisfactory! But satisfactory means average only! You want to be average or EXCEPTIONAL? Think! 🤔",
    ]
  },
  // AVERAGE: Medium activity (5.5-7), any hours
  {
    score: { min: 5.5, max: 7 },
    hours: { min: 0, max: 24 },
    messages: [
      "😐 Mediocre performance! This is not why we pay you salary! Client noticed the drop! Explanation needed in standup! 😤",
      "🙄 Average day matlab problem! We don't hire for average performance! Tomorrow better hona chahiye! WARNING ⚠️",
      "😑 Disappointing! Your resume said 'self-motivated'! Where is that motivation? Show me tomorrow! 😠",
      "😒 Not acceptable! Team reputation is going down! You want to be the reason for team's failure? IMPROVE! 🔴",
      "😤 Below expectations! HR asking about your performance! You want to explain to them or improve? Your choice! ⚡",
    ]
  },
  // POOR: Low activity (4-5.5), high hours (7+ hours) - Time waster
  {
    score: { min: 4, max: 5.5 },
    hours: { min: 7, max: 24 },
    messages: [
      "😡 Long hours but NO OUTPUT! Timepass kar rahe ho? YouTube/Instagram band karo! This is OFFICE hours! 🔴🔴",
      "🤬 PATHETIC! Sitting whole day doing what? Chair pe paisa nahi milta! WORK karo! Last warning! ⚠️⚠️",
      "😠 Waste of company resources! 8 hours me kya kiya? Personal work? This will go in your record! 📝",
      "💢 UNACCEPTABLE! Attendance se salary nahi milti! Performance chahiye! PIP discussion hoga iske liye! 🚨",
      "🔥 Time theft kar rahe ho! Client is paying for WORK not attendance! Improve or find another job! 😤",
    ]
  },
  // BAD: Low activity (4-5.5), low hours (<7 hours)
  {
    score: { min: 4, max: 5.5 },
    hours: { min: 0, max: 7 },
    messages: [
      "🚨 DISASTER! Low hours AND low work! You think this is government job? Tomorrow se serious ho jao! 😡",
      "💀 Are you even working? Or just login karke so gaye? This is going straight to HR! Explain tomorrow! 📧",
      "🔴 TERRIBLE! Client escalation aa jayega! Your casual attitude will affect whole team's appraisal! 😤",
      "⛔ Completely unacceptable! Probation extend hoga aise performance se! Want to continue or resign? 😠",
      "🚫 WORST day! Even freshers are better! You have experience but no responsibility! Shameful! 😒",
    ]
  },
  // CRITICAL: Very low activity (2.5-4), any hours
  {
    score: { min: 2.5, max: 4 },
    hours: { min: 0, max: 24 },
    messages: [
      "🚨🚨 CRITICAL ALERT! Performance Review meeting scheduled! Start updating resume if this continues! 💀",
      "☠️ Career suicide kar rahe ho! Manager's manager is asking about you! Not in good way! Fix it NOW! 🔴",
      "💣 BOMB performance! Project se remove kar denge! Bench pe jaoge! No salary revision! Think! 😱",
      "🔥🔥 Emergency! Client wants to replace you! Last chance to save your job! Tomorrow is make or break! ⚠️",
      "📉 Rock bottom! Even interns are laughing! Self respect hai ya nahi? Prove yourself tomorrow! 😤",
    ]
  },
  // INACTIVE: Near zero activity (0-2.5), any hours
  {
    score: { min: 0, max: 2.5 },
    hours: { min: 0, max: 24 },
    messages: [
      "💀💀 Are you DEAD? Should I inform HR you're on unauthorized leave? This is JOB ABANDONMENT! 🚨🚨",
      "🔴🔴🔴 ZERO work! Salary charity me de rahe hai kya? Pack your bags! Exit process initiate kar dun? 😡",
      "⚰️ RIP your career! Even office boy has better productivity! Resignation letter ready hai? Submit karo! 📝",
      "🚫🚫 Ghost employee! Payroll se naam katwa dun? Parents ko bataya job lose karne wala ho? 😤",
      "☠️☠️ Professional suicide! LinkedIn pe 'unemployed' update karo! Company me place nahi hai tumhare liye! 🔥",
    ]
  },
  // ABSENT: Zero everything
  {
    score: { min: 0, max: 1 },
    hours: { min: 0, max: 1 },
    messages: [
      "❌❌❌ ABSENT without intimation! Directly HR escalation! Termination letter draft ho raha hai! 📧💀",
      "🚨🚨🚨 AWOL! Security ko bol dun ID card block karne? Tomorrow don't need to come! We'll courier your stuff! 🔴",
      "💀💀💀 Job chod diya kya? Good decision! You weren't fit anyway! Clearance process start kar dete hai! 📋",
      "🔥🔥🔥 FIRED! No questions! No explanations! Security will escort you out! Your desk is already cleared! 🚫",
      "⛔⛔⛔ Contract TERMINATED! Blacklisted from company! No recommendation letter! Good luck finding new job! 😤",
    ]
  }
];

// Weekly activity messages - 10 categories
export const weeklyActivityMessages: ActivityMessage[] = [
  // LEGEND: Exceptional week (9-10 score, 40+ hours)
  {
    score: { min: 9, max: 10 },
    hours: { min: 40, max: 168 },
    messages: [
      "🏆🏆 LEGENDARY WEEK! CEO knows your name now! Onsite CONFIRMED! You're the FUTURE LEADER of this company! 🚀",
      "💎💎 DIAMOND performer! Whole organization is talking about you! Fast-track promotion guaranteed! Stock options coming! 🌟",
      "🔥🔥 UNSTOPPABLE! Client wants you PERMANENTLY on their account! 30% hike minimum! You're a MACHINE! 💪",
      "👑 KING/QUEEN of productivity! Your photo will go on Wall of Fame! Inspiration for whole company! Superstar! ⭐⭐",
      "🚀🚀 ROCKET performance! Singapore office wants you! Visa ready hai? This is CAREER-DEFINING week! 🌏",
    ]
  },
  // OUTSTANDING: Excellent week (8.5-9 score, 35+ hours)
  {
    score: { min: 8.5, max: 9 },
    hours: { min: 35, max: 168 },
    messages: [
      "⭐ Outstanding week! Management is IMPRESSED! Your name came up in board meeting! Bonus pakka! 💰",
      "🎯 Brilliant consistency! Five days of excellence! Role model for team! Promotion discussion started! 📈",
      "💪 Superb week! Client gave special appreciation! Your manager's manager called to congratulate! 🏅",
      "🌟 Exceptional performance! You saved the project this week! Hero of the sprint! Celebration party! 🎉",
      "🔥 What a week! Breaking all records! Other teams asking for your transfer! But we won't let you go! 💯",
    ]
  },
  // EXCELLENT: Great week (8-8.5 score, 30+ hours)
  {
    score: { min: 8, max: 8.5 },
    hours: { min: 30, max: 168 },
    messages: [
      "👏 Excellent week! Almost perfect! Just little more next week and you'll be unstoppable! Great job! 🎯",
      "✨ Very impressive! Consistent throughout! This is professional maturity! Keep this momentum! 💪",
      "🏆 Great week! You're in top 15%! Just behind the toppers! Next week you'll beat them! 📊",
      "😎 Wonderful performance! Client is happy! Manager is happy! HR is happy! Everyone loves you! 🌟",
      "🎊 Fantastic week! You proved your capability! Now maintain this standard! Success is yours! 🚀",
    ]
  },
  // VERY GOOD: Strong week (7-8 score, 30+ hours)
  {
    score: { min: 7, max: 8 },
    hours: { min: 30, max: 168 },
    messages: [
      "👍 Good week overall! But Monday was weak! Friday was lazy! Middle was okay! Room for improvement! 📈",
      "✅ Decent week! But I expected MORE! You have potential! Why settling for 'good'? Be GREAT! 💪",
      "😊 Not bad! But your teammates did better! You want to be follower or LEADER? Decide! 🎯",
      "🎯 Fair performance! But 'fair' doesn't get promotion! Push harder! Sprint ending needs strong finish! 🏃",
      "📊 Satisfactory week! But we don't celebrate mediocrity! Excellence is minimum expectation! Improve! ⚡",
    ]
  },
  // AVERAGE: Mediocre week (5.5-7 score, any hours)
  {
    score: { min: 5.5, max: 7 },
    hours: { min: 0, max: 168 },
    messages: [
      "😤 MEDIOCRE week! This is not startup mentality! We need WARRIORS not 9-to-5 mindset! Wake up! 🔴",
      "😐 Average performance AGAIN! How many warnings you need? Client is losing confidence! Fix it! ⚠️",
      "🙄 Disappointing week! Your interview feedback said 'highly motivated'! Where is that person? 😠",
      "😑 Not acceptable! Whole week wasted! What will you show in sprint review? Prepare explanations! 📝",
      "😒 Below par! Your salary is above par but work is below par! Justify your CTC! Improve NOW! 💢",
    ]
  },
  // POOR: Bad week (4.5-5.5 score, high hours 35+) - Inefficient
  {
    score: { min: 4.5, max: 5.5 },
    hours: { min: 35, max: 168 },
    messages: [
      "😡 Long hours but ZERO productivity! Office me timepass? This is THEFT of company time! Warning letter coming! 🔴",
      "🤬 PATHETIC efficiency! 40 hours me kya kiya? Facebook? WhatsApp? Personal projects? You're CAUGHT! 📧",
      "💢 Worst ROI! Company is losing money on you! Cost center ban gaye ho! Profit center bano! 😤",
      "🔥 Time waster! Whole week in office but no output! Even WFH people are better! Shameful! 😠",
      "⚠️ Inefficient! Hours don't matter, OUTPUT matters! PIP discussion scheduled! Prepare yourself! 📋",
    ]
  },
  // BAD: Poor week (4-5.5 score, low hours <35)
  {
    score: { min: 4, max: 5.5 },
    hours: { min: 0, max: 35 },
    messages: [
      "💀 DISASTER week! Are you on secret vacation? This is professional SUICIDE! HR informed! 🚨",
      "🔴 Terrible! Even interns have better stats! 3 years experience and this output? Joke hai kya? 😡",
      "☠️ Career ending week! Client asking for replacement! Your reputation is DESTROYED! Fix it or quit! 💣",
      "😤 WORST performance! Team's average going down because of you! Dragging everyone! Selfish! 🔥",
      "⛔ Unacceptable! Probation extension confirmed! No confirmation until improvement! Last chance! ⚠️",
    ]
  },
  // CRITICAL: Terrible week (2.5-4 score, any hours)
  {
    score: { min: 2.5, max: 4 },
    hours: { min: 0, max: 168 },
    messages: [
      "🚨🚨 CRITICAL FAILURE! Exit interview scheduled? Start job hunting! LinkedIn premium le lo! 💀",
      "💣💣 Week from HELL! Even ChatGPT can do better job! You're getting REPLACED by AI! 🤖",
      "🔥🔥 Emergency meeting with HR! Termination discussion! One foot out of door already! Save yourself! ⚠️",
      "☠️☠️ Professional death! No project wants you! Bench confirmation! Zero hike! Think about career change! 📉",
      "🚫🚫 Red alert! Company suffering losses because of you! Legal action possible! Improve or perish! 🔴",
    ]
  },
  // DEAD: Almost no activity (1-2.5 score)
  {
    score: { min: 1, max: 2.5 },
    hours: { min: 0, max: 168 },
    messages: [
      "💀💀💀 DEAD week! Ghost employee confirmed! Salary stopping next month! Find new job TODAY! 🚨",
      "⚰️⚰️ Career OBITUARY writing! 'Here lies a failed employee'! Parents ko bataya job gone? 😤",
      "🔴🔴🔴 TERMINATED! Clear your desk! Security waiting outside! ID card blocked! Game over! 🚫",
      "☠️☠️☠️ Professionally DEAD! Blacklisted from IT industry! Uber driver bano ab! No options left! 💣",
      "❌❌❌ FIRED! No notice period! No settlement! No recommendation! Nothing! You're DONE! 🔥",
    ]
  },
  // ABSENT: Zero activity week
  {
    score: { min: 0, max: 1 },
    hours: { min: 0, max: 168 },
    messages: [
      "🚨🚨🚨 ABSENT ENTIRE WEEK! Police complaint for fraud? Salary fraud case! Legal action initiated! 💀",
      "⛔⛔⛔ ABSCONDER! Company property recovery team dispatched! Laptop, ID, everything! You're FINISHED! 🔴",
      "💀💀💀 Missing person report filed! Job abandonment confirmed! Blacklisted forever! Career DESTROYED! 🚫",
      "🔥🔥🔥 CRIMINAL! Stealing salary without work! Cyber crime complaint! Your career is OVER! ☠️",
      "❌❌❌ FRAUD EMPLOYEE! Legal notice sent! Recovery of salary initiated! Industry ban! You're DOOMED! 💣",
    ]
  }
];

/**
 * Get a sarcastic message based on activity score and hours logged
 */
export function getActivityMessage(
  score: number, 
  hours: number, 
  isWeekly: boolean = false
): string {
  const messages = isWeekly ? weeklyActivityMessages : dailyActivityMessages;
  
  // Find matching message category
  const category = messages.find(
    msg => score >= msg.score.min && score <= msg.score.max &&
           hours >= msg.hours.min && hours <= msg.hours.max
  );
  
  if (!category || category.messages.length === 0) {
    // Fallback messages
    const fallbacks = isWeekly 
      ? ["📊 Week is over! Now prepare explanation for standup! Manager is waiting! 😤"]
      : ["📅 Day is ending! Tomorrow better performance expected! No excuses! 😠"];
    return fallbacks[0];
  }
  
  // Return random message from category
  const randomIndex = Math.floor(Math.random() * category.messages.length);
  return category.messages[randomIndex];
}