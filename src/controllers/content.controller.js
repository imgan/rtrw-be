import { crudController } from '../utils/crud.js';

export const announcements = crudController({
  table: 'announcements',
  label: 'Pengumuman',
  fields: ['kategori', 'warna', 'judul', 'isi', 'tanggal', 'penanggung_jawab', 'is_published'],
  booleans: ['is_published'],
  searchable: ['judul', 'kategori', 'isi'],
  filters: { published: 'is_published' },
  orderBy: 'tanggal DESC, id DESC',
});

export const activities = crudController({
  table: 'activities',
  label: 'Kegiatan',
  fields: ['judul', 'kategori', 'deskripsi', 'tanggal', 'waktu', 'lokasi', 'penanggung_jawab', 'fotos', 'is_published'],
  booleans: ['is_published'],
  arrays: ['fotos'],
  searchable: ['judul', 'kategori', 'lokasi'],
  filters: { published: 'is_published' },
  orderBy: 'tanggal DESC, id DESC',
});

export const facilities = crudController({
  table: 'facilities',
  label: 'Fasilitas',
  fields: ['nama', 'kategori', 'deskripsi', 'lokasi', 'kondisi', 'jam_operasional', 'penanggung_jawab', 'fotos', 'urutan', 'is_active'],
  booleans: ['is_active'],
  arrays: ['fotos'],
  searchable: ['nama', 'kategori', 'lokasi'],
  filters: { kondisi: 'kondisi' },
  orderBy: 'urutan ASC, id ASC',
});

export const contacts = crudController({
  table: 'contacts',
  label: 'Kontak',
  fields: ['nama', 'keterangan', 'telepon', 'aksi', 'tone', 'urutan', 'is_active'],
  booleans: ['is_active'],
  searchable: ['nama', 'keterangan', 'telepon'],
  orderBy: 'urutan ASC, id ASC',
});
