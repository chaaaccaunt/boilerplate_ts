<script lang="ts" setup>
defineProps<{
  users: iSharedUser.PublicUserDto[]
}>()
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead class="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th class="px-4 py-3">Пользователь</th>
            <th class="px-4 py-3">Логин</th>
            <th class="px-4 py-3">Роли</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 text-slate-700">
          <tr v-for="user in users" :key="user.uid" class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-950">{{ user.fullName }}</td>
            <td class="px-4 py-3">{{ user.login }}</td>
            <td class="px-4 py-3">{{ user.roles.map((role) => role.name).join(", ") }}</td>
          </tr>
          <tr v-if="!users.length">
            <td class="px-4 py-8 text-center text-slate-500" colspan="3">
              Пользователи не загружены
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
