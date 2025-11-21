import React from 'react';
import { Flag, BookOpen, Zap, Target, Feather, Globe, Crown, Star, Trophy, Award, Rocket, Flame, Crosshair, PenTool, CheckCircle2, Lightbulb, Infinity, TrendingUp, HelpCircle, MessageSquare, Search, School, UserCheck, ThumbsUp } from 'lucide-react';

export const BADGE_DEFINITIONS = [
    // --- SEVİYE 1: BAŞLANGIÇ ---
    {
        id: 'first_step', title: 'İlk Adım', desc: 'İlk deneme sonucunu sisteme girdin.',
        icon: <Flag />, color: 'bg-blue-500', 
        check: (scores, questions, userId) => scores.length >= 1
    },
    {
        id: 'consistent', title: 'İstikrar', desc: 'En az 3 deneme girdin.',
        icon: <Rocket />, color: 'bg-teal-500', 
        check: (scores, questions, userId) => scores.length >= 3
    },

    // --- SEVİYE 2: SORU DUVARI (YENİ) ---
    {
        id: 'curious_cat', title: 'Meraklı', desc: 'Soru Duvarında ilk sorunu sordun.',
        icon: <HelpCircle />, color: 'bg-orange-400', 
        check: (scores, questions, userId) => questions.some(q => q.askerId === userId)
    },
    {
        id: 'investigator', title: 'Araştırmacı', desc: 'Toplam 5 soru sordun.',
        icon: <Search />, color: 'bg-orange-600', 
        check: (scores, questions, userId) => questions.filter(q => q.askerId === userId).length >= 5
    },
    {
        id: 'helper', title: 'Yardım Eli', desc: 'Bir arkadaşının sorusuna yorum yazdın.',
        icon: <MessageSquare />, color: 'bg-indigo-400', 
        check: (scores, questions, userId) => questions.some(q => q.comments?.some(c => c.senderId === userId && q.askerId !== userId))
    },
    {
        id: 'mentor', title: 'Mentor', desc: '5 farklı soruya yorum/cevap yazdın.',
        icon: <School />, color: 'bg-indigo-600', 
        check: (scores, questions, userId) => {
            // Kendi sormadığı ve yorum yaptığı benzersiz soru sayısı
            const commentedQuestions = questions.filter(q => q.askerId !== userId && q.comments?.some(c => c.senderId === userId));
            return commentedQuestions.length >= 5;
        }
    },
    {
        id: 'problem_solved', title: 'Çözüldü!', desc: 'Sorduğun bir soru "Çözüldü" işaretlendi.',
        icon: <CheckCircle2 />, color: 'bg-green-500', 
        check: (scores, questions, userId) => questions.some(q => q.askerId === userId && q.isSolved)
    },
    {
        id: 'social_butterfly', title: 'Sosyal', desc: 'Hem soru sordun hem cevap verdin.',
        icon: <UserCheck />, color: 'bg-pink-500', 
        check: (scores, questions, userId) => {
            const asked = questions.some(q => q.askerId === userId);
            const answered = questions.some(q => q.comments?.some(c => c.senderId === userId));
            return asked && answered;
        }
    },

    // --- SEVİYE 3: DERS & PUAN ---
    {
        id: 'math_master', title: 'Matematik Kurdu', desc: 'TYT Matematik 30+ net.',
        icon: <Zap />, color: 'bg-yellow-500', check: (scores) => scores.some(s => s.tyt?.math >= 30)
    },
    {
        id: 'science_genius', title: 'Fen Dehası', desc: 'TYT Fen 15+ net.',
        icon: <Target />, color: 'bg-green-500', check: (scores) => scores.some(s => s.tyt?.science >= 15)
    },
    {
        id: 'ayt_beast', title: 'AYT Canavarı', desc: 'AYT Matematik 30+ net.',
        icon: <Flame />, color: 'bg-rose-600', check: (scores) => scores.some(s => s.ayt?.math >= 30)
    },
    {
        id: 'elite_400', title: 'Elit 400', desc: '400+ Y-Puanı.',
        icon: <Star />, color: 'bg-purple-500', check: (scores) => scores.some(s => s.placementScore >= 400)
    },
    {
        id: 'king_450', title: 'Kral 450', desc: '450+ Y-Puanı.',
        icon: <Crown />, color: 'bg-purple-700', check: (scores) => scores.some(s => s.placementScore >= 450)
    },
    {
        id: 'legend_500', title: 'Efsane 500', desc: '500+ Y-Puanı.',
        icon: <Trophy />, color: 'bg-yellow-600', check: (scores) => scores.some(s => s.placementScore >= 500)
    },
    
    // --- SEVİYE 4: EKSTRA ---
    {
        id: 'improving', title: 'Yükseliş', desc: 'Son denemede puanını arttırdın.',
        icon: <TrendingUp />, color: 'bg-lime-500', 
        check: (scores) => {
            if (scores.length < 2) return false;
            return scores[0].finalScore > scores[1].finalScore;
        }
    },
    {
        id: 'full_focus', title: 'Kusursuz', desc: 'Herhangi bir derste FULL çektin!',
        icon: <ThumbsUp />, color: 'bg-emerald-600', 
        check: (scores) => scores.some(s => s.tyt?.math === 40 || s.tyt?.turkish === 40 || s.ayt?.math === 40)
    }
];

// Helper: Kazanılanları hesapla (Artık questions ve userId de alıyor)
export const calculateUserBadges = (scores, questions = [], userId = "") => {
    if (!scores || !Array.isArray(scores)) return [];
    return BADGE_DEFINITIONS.filter(badge => badge.check(scores, questions, userId));
};