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
      "🔥🔥 Excellent! Client will be SO HAPPY! You are on FIRE today! But don't burnout, we need same performance tomorrow also! 💪",
      "👏 OUTSTANDING! This is what we call DEDICATION! Onsite opportunity likely for you! Keep it up champion! 🏆",
      "🌟 Superb work! You're making entire team look good! Manager's manager also noticed your work today! Promotion in sight... 📈",
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
      "⚡ Quality over quantity - PERFECT example! But more time commitment will make client happier! 🎯",
      "💎 Excellent productivity! But only half day? Was there a personal commitment? Tomorrow full day expected! 😅",
      "🔥 Superb intensity! But time is less! Stretch a bit more, appraisal is coming! Rating depends on hours also! ⏰",
      "👌 High quality work! But competitors are putting more hours! Don't let them win! Tomorrow full day confirmed? 💪",
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
      "😊 Not bad! But client expects MORE from our team! Don't be satisfied with 'good enough'! Excellence is needed! 🚀",
      "🎯 Fair job! But your colleague did better today! Healthy competition hai, but you should win na! 😤",
      "📈 Satisfactory! But satisfactory means average only! You want to be average or EXCEPTIONAL? Think! 🤔",
    ]
  },
  // AVERAGE: Medium activity (5.5-7), any hours
  {
    score: { min: 5.5, max: 7 },
    hours: { min: 0, max: 24 },
    messages: [
      "😐 Mediocre performance! This affects our team metrics! Client noticed the drop! Explanation needed in standup! 😤",
      "🙄 Average day means there's a problem! We don't hire for average performance! Tomorrow must be better! WARNING ⚠️",
      "😑 Disappointing! Your resume said 'self-motivated'! Where is that motivation? Show me tomorrow! 😠",
      "😒 Not acceptable! Team reputation is going down! You want to be the reason for team's failure? IMPROVE! 🔴",
      "😤 Below expectations! HR is tracking your performance! Need immediate improvement to avoid escalation! ⚡",
    ]
  },
  // POOR: Low activity (4-5.5), high hours (7+ hours) - Time waster
  {
    score: { min: 4, max: 5.5 },
    hours: { min: 7, max: 24 },
    messages: [
      "😡 Long hours but NO OUTPUT! Are you doing personal work? Focus on office tasks! This is OFFICE hours! 🔴🔴",
      "🤬 Very poor productivity! Sitting whole day with minimal output! We need WORK not just attendance! This is concerning! ⚠️⚠️",
      "😠 Inefficient use of time! 8 hours with this output? This will affect your performance review! 📝",
      "💢 UNACCEPTABLE! Attendance alone doesn't justify salary! Performance is needed! This may affect your appraisal! 🚨",
      "🔥 Time not well utilized! Client is paying for WORK not just presence! Immediate improvement needed! 😤",
    ]
  },
  // BAD: Low activity (4-5.5), low hours (<7 hours)
  {
    score: { min: 4, max: 5.5 },
    hours: { min: 0, max: 7 },
    messages: [
      "🚨 DISASTER! Low hours AND low work! This is not acceptable in our work culture! Need immediate improvement! 😡",
      "💀 Are you even working? Or just logged in without working? This will be discussed with your manager! Explain tomorrow! 📧",
      "🔴 TERRIBLE! Client may escalate this! Your casual attitude will affect whole team's appraisal! 😤",
      "⛔ Completely unacceptable! This performance may affect your confirmation! Serious improvement needed! 😠",
      "🚫 WORST day! Even freshers are performing better! You have experience but where's the output? Very disappointing! 😒",
    ]
  },
  // CRITICAL: Very low activity (2.5-4), any hours
  {
    score: { min: 2.5, max: 4 },
    hours: { min: 0, max: 24 },
    messages: [
      "🚨🚨 CRITICAL ALERT! Performance Review meeting scheduled! This will seriously impact your appraisal! 💀",
      "☠️ This is damaging your career! Manager's manager is asking about you! Not in good way! Fix it NOW! 🔴",
      "💣 Extremely poor performance! May affect your project allocation! Could impact salary revision! Think seriously! 😱",
      "🔥🔥 Emergency! Client is concerned about your performance! This needs immediate correction! Tomorrow is crucial! ⚠️",
      "📉 Rock bottom performance! Even interns are outperforming! Where is your professional pride? Prove yourself tomorrow! 😤",
    ]
  },
  // INACTIVE: Near zero activity (0-2.5), any hours
  {
    score: { min: 0, max: 2.5 },
    hours: { min: 0, max: 24 },
    messages: [
      "💀💀 Are you present? Should I inform HR about this unauthorized absence? This looks like abandonment of duties! 🚨🚨",
      "🔴🔴🔴 ZERO work detected! This is unacceptable! Your position in the team is at serious risk! 😡",
      "⚰️ Career-damaging performance! Productivity is non-existent! This will have serious consequences on your appraisal! 📝",
      "🚫🚫 No activity detected! This will affect your monthly variable pay! Management will be informed! 😤",
      "☠️☠️ Professional disaster! This performance is grounds for serious disciplinary action! Immediate improvement required! 🔥",
    ]
  },
  // ABSENT: Zero everything
  {
    score: { min: 0, max: 1 },
    hours: { min: 0, max: 1 },
    messages: [
      "❌❌❌ ABSENT without intimation! HR will be notified! This will severely impact your attendance record! 📧💀",
      "🚨🚨🚨 Absence Without Leave! This is a serious violation! Disciplinary action will be initiated! 🔴",
      "💀💀💀 Complete absence from work! This shows lack of commitment! Will be escalated to senior management! 📋",
      "🔥🔥🔥 Unauthorized absence! This is grounds for serious action! Your performance rating will be severely impacted! 🚫",
      "⛔⛔⛔ No work record found! This will result in loss of variable pay and affect your annual review! 😤",
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
      "🏆🏆 LEGENDARY WEEK! CEO knows your name now! Onsite opportunity very likely! You're showing leadership potential! 🚀",
      "💎💎 DIAMOND performer! Whole organization is talking about you! Fast-track promotion being considered! Great work! 🌟",
      "🔥🔥 UNSTOPPABLE! Client wants you on critical projects! Excellent hike expected! You're a top performer! 💪",
      "👑 CHAMPION of productivity! Your work will be showcased as best practice! Inspiration for whole company! Superstar! ⭐⭐",
      "🚀🚀 ROCKET performance! International opportunities opening up! Are you ready? This is CAREER-DEFINING week! 🌏",
    ]
  },
  // OUTSTANDING: Excellent week (8.5-9 score, 35+ hours)
  {
    score: { min: 8.5, max: 9 },
    hours: { min: 35, max: 168 },
    messages: [
      "⭐ Outstanding week! Management is IMPRESSED! Your name came up in leadership meeting! Bonus very likely! 💰",
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
      "😤 MEDIOCRE week! This is not the right approach! We need go-getters not 9-to-5 mindset! Step up! 🔴",
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
      "😡 Long hours but minimal productivity! Were you doing personal work in office? This affects team metrics! Warning issued! 🔴",
      "🤬 Very poor efficiency! 45 hours with this output? Were you distracted? This is concerning! 📧",
      "💢 Poor return on investment! You're becoming a liability! Need to become an asset! 😤",
      "🔥 Time not utilized well! Whole week in office but minimal output! Even remote workers are more productive! 😠",
      "⚠️ Inefficient! Hours don't matter, OUTPUT matters! Performance improvement needed! Review scheduled! 📋",
    ]
  },
  // BAD: Poor week (4-5.5 score, low hours <35)
  {
    score: { min: 4, max: 5.5 },
    hours: { min: 0, max: 35 },
    messages: [
      "💀 DISASTER week! Were you on leave without informing? This is highly unprofessional! HR will be informed! 🚨",
      "🔴 Terrible! Even interns have better stats! With your experience, this output is unacceptable! 😡",
      "☠️ Career-damaging week! Client is dissatisfied! Your reputation is at stake! Immediate improvement needed! 💣",
      "😤 WORST performance! Team's average dropping because of you! This affects everyone's appraisal! 🔥",
      "⛔ Unacceptable! This may affect your confirmation! Significant improvement needed immediately! ⚠️",
    ]
  },
  // CRITICAL: Terrible week (2.5-4 score, any hours)
  {
    score: { min: 2.5, max: 4 },
    hours: { min: 0, max: 168 },
    messages: [
      "🚨🚨 CRITICAL FAILURE! Performance review scheduled urgently! This will severely impact your career! 💀",
      "💣💣 Worst week on record! Even automated systems perform better! Your role is under review! 🤖",
      "🔥🔥 Emergency meeting with management! Serious discussion about your performance! Immediate action required! ⚠️",
      "☠️☠️ Professional crisis! Project allocation at risk! No increment possible! Serious introspection needed! 📉",
      "🚫🚫 Red alert! Your performance is impacting team deliverables! Immediate improvement mandatory! 🔴",
    ]
  },
  // DEAD: Almost no activity (1-2.5 score)
  {
    score: { min: 1, max: 2.5 },
    hours: { min: 0, max: 168 },
    messages: [
      "💀💀💀 Zero productivity week! This confirms lack of commitment! Variable pay will be severely impacted! 🚨",
      "⚰️⚰️ Career at serious risk! This performance is unacceptable at any level! Immediate correction needed! 😤",
      "🔴🔴🔴 Complete failure! This will be escalated to senior leadership! Your position is under serious review! 🚫",
      "☠️☠️☠️ Professional disaster! This will affect your entire appraisal cycle! No recovery without drastic improvement! 💣",
      "❌❌❌ Critical performance failure! All benefits and incentives at risk! Immediate action required! 🔥",
    ]
  },
  // ABSENT: Zero activity week
  {
    score: { min: 0, max: 1 },
    hours: { min: 0, max: 168 },
    messages: [
      "🚨🚨🚨 ABSENT ENTIRE WEEK! This is abandonment of duties! HR and legal team will be involved! 💀",
      "⛔⛔⛔ No attendance record! Company assets need to be returned! This is a serious violation! 🔴",
      "💀💀💀 Complete absence from work! This is grounds for disciplinary action! Your record will be permanently affected! 🚫",
      "🔥🔥🔥 Zero work for entire week! This is breach of employment terms! Serious consequences will follow! ☠️",
      "❌❌❌ Unauthorized absence for full week! This will result in loss of all benefits and severe action! 💣",
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
      ? ["📊 Week is over! Prepare your excuses! Manager will review performance! 😤"]
      : ["📅 Day is ending! Tomorrow better performance expected! No excuses! 😠"];
    return fallbacks[0];
  }
  
  // Return random message from category
  const randomIndex = Math.floor(Math.random() * category.messages.length);
  return category.messages[randomIndex];
}