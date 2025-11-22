import React from 'react';
import { Flag, BookOpen, Zap, Target, Feather, Globe, Crown, Star, Trophy, Award, Rocket, Flame, Crosshair, PenTool, CheckCircle2, Lightbulb, Moon, CalendarDays, Sun, Infinity, TrendingUp, HelpCircle, MessageSquare, Search, School, UserCheck, ThumbsUp, Layers } from 'lucide-react';

export const BADGE_DEFINITIONS = [
    // --- YENİ: DİSİPLİN & STREAK (ZİNCİR) ---
    {
        id: 'streak_3', title: 'Isınma Turu', desc: '3 Gün üst üste çalışma kaydettin.',
        icon: <Flame />, color: 'bg-orange-400', 
        check: (scores, questions, user) => (user.streak || 0) >= 3
    },
    {
        id: 'streak_7', title: 'Alev Aldın', desc: '7 Günlük zincir! Durdurulamıyorsun.',
        icon: <Flame />, color: 'bg-red-500', 
        check: (scores, questions, user) => (user.streak || 0) >= 7
    },
    {
        id: 'streak_30', title: 'Disiplin Abidesi', desc: '30 Gün boyunca zinciri kırmadın.',
        icon: <Flame />, color: 'bg-purple-600', 
        check: (scores, questions, user) => (user.streak || 0) >= 30
    },
    {
        id: 'solver_100', title: 'Çırak', desc: 'Toplam 100 soru çözdün.',
        icon: <PenTool />, color: 'bg-blue-400', 
        check: (scores, questions, user) => (user.totalSolved || 0) >= 100
    },
    {
        id: 'solver_1000', title: 'Usta', desc: 'Toplam 1.000 soru barajını aştın.',
        icon: <Layers />, color: 'bg-indigo-600', 
        check: (scores, questions, user) => (user.totalSolved || 0) >= 1000
    },
    {
        id: 'planner', title: 'Planlı Hayat', desc: 'Haftalık programına 5+ görev ekledin.',
        icon: <CalendarDays />, color: 'bg-emerald-500',
        check: (scores, questions, user) => {
            if (!user.studySchedule) return false;
            return Object.values(user.studySchedule).flat().length >= 5;
        }
    },

    // --- ESKİ & KLASİK: SINAV BAŞARILARI ---
    {
        id: 'first_step', title: 'İlk Adım', desc: 'İlk deneme sonucunu sisteme girdin.',
        icon: <Flag />, color: 'bg-blue-500', check: (scores) => scores.length >= 1
    },
    {
        id: 'consistent', title: 'İstikrar', desc: 'En az 3 deneme girdin.',
        icon: <Rocket />, color: 'bg-teal-500', check: (scores) => scores.length >= 3
    },
    {
        id: 'math_master', title: 'Matematik Kurdu', desc: 'TYT Matematik 30+ net.',
        icon: <Zap />, color: 'bg-yellow-500', check: (scores) => scores.some(s => s.tyt?.math >= 30)
    },
    {
        id: 'science_genius', title: 'Fen Dehası', desc: 'TYT Fen 15+ net.',
        icon: <Target />, color: 'bg-green-500', check: (scores) => scores.some(s => s.tyt?.science >= 15)
    },
    {
        id: 'turkish_poet', title: 'Edebiyatçı', desc: 'TYT Türkçe 30+ net.',
        icon: <Feather />, color: 'bg-red-500', check: (scores) => scores.some(s => s.tyt?.turkish >= 30)
    },
    {
        id: 'ayt_beast', title: 'AYT Canavarı', desc: 'AYT Matematik 30+ net.',
        icon: <Flame />, color: 'bg-rose-600', check: (scores) => scores.some(s => s.ayt?.math >= 30)
    },
    {
        id: 'full_focus', title: 'Kusursuz', desc: 'Herhangi bir derste FULL çektin!',
        icon: <CheckCircle2 />, color: 'bg-emerald-600', 
        check: (scores) => scores.some(s => s.tyt?.math === 40 || s.tyt?.turkish === 40 || s.ayt?.math === 40)
    },
    {
        id: 'elite_400', title: 'Elit 400', desc: '400+ Y-Puanı.',
        icon: <Star />, color: 'bg-purple-500', check: (scores) => scores.some(s => s.placementScore >= 400)
    },
    {
        id: 'legend_500', title: 'Efsane 500', desc: '500+ Y-Puanı.',
        icon: <Trophy />, color: 'bg-yellow-600', check: (scores) => scores.some(s => s.placementScore >= 500)
    },
    {
        id: 'improving', title: 'Yükseliş', desc: 'Son denemede puanını arttırdın.',
        icon: <TrendingUp />, color: 'bg-lime-500', 
        check: (scores) => {
            if (scores.length < 2) return false;
            return scores[0].finalScore > scores[1].finalScore;
        }
    },

    // --- SOSYAL & AKTİVİTE ---
    {
        id: 'curious_cat', title: 'Meraklı', desc: 'Soru Duvarında ilk sorunu sordun.',
        icon: <HelpCircle />, color: 'bg-orange-400', 
        check: (scores, questions, user) => questions.some(q => q.askerId === user.internalId)
    },
    {
        id: 'helper', title: 'Yardım Eli', desc: 'Bir arkadaşının sorusuna yorum yazdın.',
        icon: <MessageSquare />, color: 'bg-indigo-400', 
        check: (scores, questions, user) => questions.some(q => q.comments?.some(c => c.senderId === user.internalId && q.askerId !== user.internalId))
    },
    {
        id: 'problem_solved', title: 'Çözüldü!', desc: 'Sorduğun bir soru "Çözüldü" işaretlendi.',
        icon: <ThumbsUp />, color: 'bg-green-500', 
        check: (scores, questions, user) => questions.some(q => q.askerId === user.internalId && q.isSolved)
    }
];

// HELPER GÜNCELLENDİ: Artık 'user' objesini de alıyor
export const calculateUserBadges = (scores, questions = [], user = {}) => {
    if (!user) return [];
    return BADGE_DEFINITIONS.filter(badge => badge.check(scores || [], questions, user));
};