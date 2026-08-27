import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, EmptyState } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/badge';
import { Tag, Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: categories } = await supabase
    .from('asset_categories')
    .select('id, name, code, description')
    .order('name');

  // Count assets per category
  const { data: assets } = await supabase
    .from('assets')
    .select('category_id');

  const countMap = (assets ?? []).reduce((acc: Record<string, number>, a: any) => {
    if (a.category_id) {
      acc[a.category_id] = (acc[a.category_id] ?? 0) + 1;
    }
    return acc;
  }, {});

  const enriched = (categories ?? []).map((c: any) => ({
    ...c,
    asset_count: countMap[c.id] ?? 0,
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Asset Categories</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Standardized classification for all physical assets
        </p>
      </div>

      {enriched.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-8 w-8" />}
          title="No categories found"
          description="Categories will appear once defined in the database"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enriched.map((cat: any) => (
            <Card key={cat.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-zinc-900 text-sm">{cat.name}</h3>
                    <p className="font-mono text-xs text-indigo-600 mt-0.5">{cat.code}</p>
                  </div>
                  <Badge variant="default" className="shrink-0">
                    <Package className="h-3 w-3 mr-1" />
                    {cat.asset_count}
                  </Badge>
                </div>
                {cat.description && (
                  <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{cat.description}</p>
                )}
                <Link
                  href={`/inventory?category=${cat.id}`}
                  className="mt-3 block text-xs font-medium text-indigo-600 hover:underline"
                >
                  View all assets in category →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
