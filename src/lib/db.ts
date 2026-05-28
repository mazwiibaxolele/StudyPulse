import { supabase } from './supabase';
import type { Module, StudySession, Mark, ChatMessage, UserPreferences } from '../types';
import { DEFAULT_PREFERENCES } from '../types';

export const modulesDb = {
  async getAll(): Promise<Module[]> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    // Map snake_case to camelCase
    return data.map((m: any) => ({
      id: m.id,
      name: m.name,
      code: m.code,
      color: m.color,
      credits: m.credits,
      isActive: m.is_active,
      createdAt: m.created_at,
    }));
  },

  async create(data: Omit<Module, 'id' | 'createdAt' | 'isActive'>): Promise<Module> {
    const { data: m, error } = await supabase
      .from('modules')
      .insert({
        name: data.name,
        code: data.code,
        color: data.color,
        credits: data.credits,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: m.id,
      name: m.name,
      code: m.code,
      color: m.color,
      credits: m.credits,
      isActive: m.is_active,
      createdAt: m.created_at,
    };
  },

  async update(id: string, data: Partial<Module>): Promise<void> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.credits !== undefined) updateData.credits = data.credits;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { error } = await supabase.from('modules').update(updateData).eq('id', id);
    if (error) throw error;
  },

  async archive(id: string): Promise<void> {
    await this.update(id, { isActive: false });
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (error) throw error;
  },
};

export const sessionsDb = {
  async getAll(): Promise<StudySession[]> {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .order('started_at', { ascending: false });
    if (error) throw error;
    return data.map((s: any) => ({
      id: s.id,
      moduleId: s.module_id,
      studyMethod: s.study_method,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      durationMins: s.duration_mins,
      pomodorosDone: s.pomodoros_done,
      breaksTaken: s.breaks_taken,
      focusRating: s.focus_rating,
      notes: s.notes,
      createdAt: s.created_at,
    }));
  },

  async create(data: Omit<StudySession, 'id' | 'createdAt'>): Promise<StudySession> {
    const { data: s, error } = await supabase
      .from('study_sessions')
      .insert({
        module_id: data.moduleId,
        study_method: data.studyMethod,
        started_at: data.startedAt,
        ended_at: data.endedAt,
        duration_mins: data.durationMins,
        pomodoros_done: data.pomodorosDone,
        breaks_taken: data.breaksTaken,
        focus_rating: data.focusRating,
        notes: data.notes,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: s.id,
      moduleId: s.module_id,
      studyMethod: s.study_method,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      durationMins: s.duration_mins,
      pomodorosDone: s.pomodoros_done,
      breaksTaken: s.breaks_taken,
      focusRating: s.focus_rating,
      notes: s.notes,
      createdAt: s.created_at,
    };
  },
};

export const marksDb = {
  async getAll(): Promise<Mark[]> {
    const { data, error } = await supabase
      .from('marks')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data.map((m: any) => ({
      id: m.id,
      moduleId: m.module_id,
      title: m.title,
      type: m.type,
      score: m.score,
      total: m.total,
      percentage: m.percentage,
      date: m.date,
      weight: m.weight,
      createdAt: m.created_at,
    }));
  },

  async create(data: Omit<Mark, 'id' | 'percentage' | 'createdAt'>): Promise<Mark> {
    const percentage = (data.score / data.total) * 100;
    const { data: m, error } = await supabase
      .from('marks')
      .insert({
        module_id: data.moduleId,
        title: data.title,
        type: data.type,
        score: data.score,
        total: data.total,
        percentage,
        date: data.date,
        weight: data.weight,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: m.id,
      moduleId: m.module_id,
      title: m.title,
      type: m.type,
      score: m.score,
      total: m.total,
      percentage: m.percentage,
      date: m.date,
      weight: m.weight,
      createdAt: m.created_at,
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('marks').delete().eq('id', id);
    if (error) throw error;
  },
};

export const preferencesDb = {
  async get(): Promise<UserPreferences> {
    const { data, error } = await supabase.from('user_preferences').select('*').single();
    if (error || !data) return DEFAULT_PREFERENCES;
    return {
      focusDuration: data.focus_duration,
      shortBreakDuration: data.short_break_duration,
      longBreakDuration: data.long_break_duration,
      pomodorosBeforeLongBreak: data.pomodoros_before_long_break,
      gradeScaleId: data.grade_scale_id,
      autoStartBreaks: data.auto_start_breaks,
      soundEnabled: data.sound_enabled,
    };
  },

  async update(data: Partial<UserPreferences>): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const updateData: any = {};
    if (data.focusDuration !== undefined) updateData.focus_duration = data.focusDuration;
    if (data.shortBreakDuration !== undefined) updateData.short_break_duration = data.shortBreakDuration;
    if (data.longBreakDuration !== undefined) updateData.long_break_duration = data.longBreakDuration;
    if (data.pomodorosBeforeLongBreak !== undefined) updateData.pomodoros_before_long_break = data.pomodorosBeforeLongBreak;
    if (data.gradeScaleId !== undefined) updateData.grade_scale_id = data.gradeScaleId;
    if (data.autoStartBreaks !== undefined) updateData.auto_start_breaks = data.autoStartBreaks;
    if (data.soundEnabled !== undefined) updateData.sound_enabled = data.soundEnabled;

    await supabase.from('user_preferences').update(updateData).eq('user_id', user.user.id);
  },
};

export const chatDb = {
  async getAll(): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) return [];
    return data.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    }));
  },

  async add(role: 'user' | 'assistant', content: string): Promise<ChatMessage> {
    const { data: m, error } = await supabase
      .from('chat_messages')
      .insert({ role, content })
      .select()
      .single();
    if (error) throw error;
    return {
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    };
  },

  async clear(): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      await supabase.from('chat_messages').delete().eq('user_id', user.user.id);
    }
  },
};
