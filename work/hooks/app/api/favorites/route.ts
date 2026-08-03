import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { generationId, hookIndex, tags } = await request.json();

  if (!generationId || hookIndex === undefined) {
    return NextResponse.json({ error: "INVALID_PARAMS" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("hook_favorites")
      .upsert(
        {
          user_id: user.id,
          generation_id: generationId,
          hook_index: hookIndex,
          tags: tags || [],
        },
        { onConflict: "user_id,generation_id,hook_index" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("Favorite creation failed:", err);
    return NextResponse.json({ error: "CREATION_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const generationId = searchParams.get("generationId");
  const hookIndex = searchParams.get("hookIndex");

  if (!generationId || hookIndex === null) {
    return NextResponse.json({ error: "INVALID_PARAMS" }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from("hook_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("generation_id", generationId)
      .eq("hook_index", parseInt(hookIndex));

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Favorite deletion failed:", err);
    return NextResponse.json({ error: "DELETION_FAILED" }, { status: 500 });
  }
}
