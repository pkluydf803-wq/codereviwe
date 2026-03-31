export const themeStyles = {
  light: {
    bg: 'bg-[#F8F9FA]',
    text: 'text-[#1A1A1A]',
    border: 'border-[#E0E0E0]',
    card: 'bg-[#FFFFFF]',
    header: 'bg-[#FFFFFF]',
    accent: 'text-[#3B82F6]',
    muted: 'text-[#6B7280]',
    codeBg: 'bg-[#F1F5F9]',
    codeText: 'text-[#0F172A]',
    shadow: 'shadow-sm',
    navBg: 'bg-[#F1F5F9]',
    navItem: 'text-[#6B7280]',
    navItemActive: 'bg-[#3B82F6] text-white',
    inputBg: 'bg-[#FFFFFF]',
    inputText: 'text-[#1A1A1A]',
    placeholder: 'placeholder:text-[#9CA3AF]',
    headerBorder: 'border-[#E0E0E0]',
    footerBg: 'bg-[#FFFFFF]',
    footerBorder: 'border-[#E0E0E0]',
    footerText: 'text-[#6B7280]',
    hoverBg: 'hover:bg-[#F1F5F9]',
    rowBorder: 'border-[#E0E0E0]',
    panelHeader: 'bg-[#F8F9FA]',
    panelHeaderText: 'text-[#1A1A1A]',
    summaryCard: 'bg-[#FFFFFF] border-[#E0E0E0]',
    bugCard: 'bg-[#FFFFFF] border-[#E0E0E0]',
    bugCardHover: 'hover:bg-[#F8F9FA]',
    explanationCard: 'bg-[#FFFFFF] border-[#E0E0E0]',
    fixedCodeCard: 'bg-[#FFFFFF] border-[#E0E0E0]',
    fixedCodeHeader: 'bg-[#F8F9FA]',
    fixedCodeBg: 'bg-[#F1F5F9]',
    fixedCodeText: 'text-[#0F172A]',
  },
  dark: {
    bg: 'bg-[#000000]',
    text: 'text-[#FFFFFF]',
    border: 'border-[#333333]',
    card: 'bg-[#0A0A0A]',
    header: 'bg-[#000000]',
    accent: 'text-[#3B82F6]',
    muted: 'text-[#A0A0A0]',
    codeBg: 'bg-[#000000]',
    codeText: 'text-[#E0E0E0]',
    shadow: 'shadow-2xl',
    navBg: 'bg-[#1A1A1A]',
    navItem: 'text-[#A0A0A0]',
    navItemActive: 'bg-[#3B82F6] text-white',
    inputBg: 'bg-[#000000]',
    inputText: 'text-[#E0E0E0]',
    placeholder: 'placeholder:text-[#404040]',
    headerBorder: 'border-[#333333]',
    footerBg: 'bg-[#0A0A0A]',
    footerBorder: 'border-[#333333]',
    footerText: 'text-[#404040]',
    hoverBg: 'hover:bg-[#1A1A1A]',
    rowBorder: 'border-[#333333]',
    panelHeader: 'bg-[#1A1A1A]',
    panelHeaderText: 'text-[#FFFFFF]',
    summaryCard: 'bg-[#0A0A0A] border-[#333333]',
    bugCard: 'bg-[#0A0A0A] border-[#333333]',
    bugCardHover: 'hover:bg-[#1A1A1A]',
    explanationCard: 'bg-[#0A0A0A] border-[#333333]',
    fixedCodeCard: 'bg-[#0A0A0A] border-[#333333]',
    fixedCodeHeader: 'bg-[#1A1A1A]',
    fixedCodeBg: 'bg-[#000000]',
    fixedCodeText: 'text-[#22C55E]',
  },
  'high-contrast': {
    bg: 'bg-[#000000]',
    text: 'text-[#FFFFFF]',
    border: 'border-2 border-[#FFFFFF]',
    card: 'bg-[#000000]',
    header: 'bg-[#000000]',
    accent: 'text-[#3B82F6]',
    muted: 'text-[#FFFFFF]',
    codeBg: 'bg-[#000000]',
    codeText: 'text-[#FFFFFF]',
    shadow: 'none',
    navBg: 'bg-[#000000]',
    navItem: 'text-[#FFFFFF]',
    navItemActive: 'bg-[#FFFFFF] text-[#000000]',
    inputBg: 'bg-[#000000]',
    inputText: 'text-[#FFFFFF]',
    placeholder: 'placeholder:text-[#FFFFFF]',
    headerBorder: 'border-b-2 border-[#FFFFFF]',
    footerBg: 'bg-[#000000]',
    footerBorder: 'border-t-2 border-[#FFFFFF]',
    footerText: 'text-[#FFFFFF]',
    hoverBg: 'hover:bg-[#333333]',
    rowBorder: 'border-b-2 border-[#FFFFFF]',
    panelHeader: 'bg-[#000000]',
    panelHeaderText: 'text-[#FFFFFF]',
    summaryCard: 'bg-[#000000] border-2 border-[#FFFFFF]',
    bugCard: 'bg-[#000000] border-2 border-[#FFFFFF]',
    bugCardHover: 'hover:bg-[#333333]',
    explanationCard: 'bg-[#000000] border-2 border-[#FFFFFF]',
    fixedCodeCard: 'bg-[#000000] border-2 border-[#FFFFFF]',
    fixedCodeHeader: 'bg-[#000000]',
    fixedCodeBg: 'bg-[#000000]',
    fixedCodeText: 'text-[#FFFFFF]',
  }
};

export const CHALLENGES: any[] = [
  {
    id: '1',
    title: 'Two Sum',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
    difficulty: 'Easy',
    language: 'javascript',
    initialCode: 'function twoSum(nums, target) {\n  // Your code here\n}',
    testCases: [
      { input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]', description: 'Basic test case' },
      { input: '[3, 2, 4], 6', expectedOutput: '[1, 2]', description: 'Middle elements' },
      { input: '[3, 3], 6', expectedOutput: '[0, 1]', description: 'Same values' }
    ]
  },
  {
    id: '2',
    title: 'Palindrome Number',
    description: 'Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.',
    difficulty: 'Easy',
    language: 'javascript',
    initialCode: 'function isPalindrome(x) {\n  // Your code here\n}',
    testCases: [
      { input: '121', expectedOutput: 'true', description: 'Positive palindrome' },
      { input: '-121', expectedOutput: 'false', description: 'Negative number' },
      { input: '10', expectedOutput: 'false', description: 'Non-palindrome' }
    ]
  },
  {
    id: '3',
    title: 'Reverse String',
    description: 'Write a function that reverses a string. The input string is given as an array of characters `s`.',
    difficulty: 'Easy',
    language: 'javascript',
    initialCode: 'function reverseString(s) {\n  // Your code here\n}',
    testCases: [
      { input: '["h","e","l","l","o"]', expectedOutput: '["o","l","l","e","h"]', description: 'Basic string' },
      { input: '["H","a","n","n","a","h"]', expectedOutput: '["h","a","n","n","a","H"]', description: 'Capitalized string' }
    ]
  },
  {
    id: '4',
    title: 'Valid Parentheses',
    description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.',
    difficulty: 'Easy',
    language: 'javascript',
    initialCode: 'function isValid(s) {\n  // Your code here\n}',
    testCases: [
      { input: '"()"', expectedOutput: 'true', description: 'Simple pair' },
      { input: '"()[]{}"', expectedOutput: 'true', description: 'Multiple pairs' },
      { input: '"(]"', expectedOutput: 'false', description: 'Mismatched pair' }
    ]
  },
  {
    id: '5',
    title: 'Fibonacci Number',
    description: 'The Fibonacci numbers, commonly denoted `F(n)` form a sequence, called the Fibonacci sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1.',
    difficulty: 'Easy',
    language: 'javascript',
    initialCode: 'function fib(n) {\n  // Your code here\n}',
    testCases: [
      { input: '2', expectedOutput: '1', description: 'F(2)' },
      { input: '3', expectedOutput: '2', description: 'F(3)' },
      { input: '4', expectedOutput: '3', description: 'F(4)' }
    ]
  },
  {
    id: '6',
    title: 'Max Subarray',
    description: 'Given an integer array `nums`, find the subarray with the largest sum, and return its sum.',
    difficulty: 'Medium',
    language: 'javascript',
    initialCode: 'function maxSubArray(nums) {\n  // Your code here\n}',
    testCases: [
      { input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', description: 'Standard array' },
      { input: '[1]', expectedOutput: '1', description: 'Single element' },
      { input: '[5,4,-1,7,8]', expectedOutput: '23', description: 'All positive' }
    ]
  },
  {
    id: '7',
    title: 'Merge Sorted Array',
    description: 'You are given two integer arrays `nums1` and `nums2`, sorted in non-decreasing order, and two integers `m` and `n`, representing the number of elements in `nums1` and `nums2` respectively. Merge `nums2` into `nums1` as one sorted array.',
    difficulty: 'Easy',
    language: 'javascript',
    initialCode: 'function merge(nums1, m, nums2, n) {\n  // Your code here\n}',
    testCases: [
      { input: '[1,2,3,0,0,0], 3, [2,5,6], 3', expectedOutput: '[1,2,2,3,5,6]', description: 'Standard merge' },
      { input: '[1], 1, [], 0', expectedOutput: '[1]', description: 'Empty second array' }
    ]
  },
  {
    id: '8',
    title: 'Climbing Stairs',
    description: 'You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
    difficulty: 'Easy',
    language: 'javascript',
    initialCode: 'function climbStairs(n) {\n  // Your code here\n}',
    testCases: [
      { input: '2', expectedOutput: '2', description: '2 steps' },
      { input: '3', expectedOutput: '3', description: '3 steps' }
    ]
  },
  {
    id: '9',
    title: 'Valid Anagram',
    description: 'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.',
    difficulty: 'Easy',
    language: 'javascript',
    initialCode: 'function isAnagram(s, t) {\n  // Your code here\n}',
    testCases: [
      { input: '"anagram", "nagaram"', expectedOutput: 'true', description: 'Valid anagram' },
      { input: '"rat", "car"', expectedOutput: 'false', description: 'Invalid anagram' }
    ]
  },
  {
    id: '10',
    title: 'Maximum Depth of Binary Tree',
    description: 'Given the `root` of a binary tree, return its maximum depth. A binary tree\'s maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.',
    difficulty: 'Easy',
    language: 'javascript',
    initialCode: 'function maxDepth(root) {\n  // Your code here\n}',
    testCases: [
      { input: '[3,9,20,null,null,15,7]', expectedOutput: '3', description: 'Standard tree' },
      { input: '[1,null,2]', expectedOutput: '2', description: 'Skewed tree' }
    ]
  },
  {
    id: '11',
    title: 'Best Time to Buy and Sell Stock',
    description: 'You are given an array `prices` where `prices[i]` is the price of a given stock on the `i`th day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.',
    difficulty: 'Easy',
    language: 'javascript',
    initialCode: 'function maxProfit(prices) {\n  // Your code here\n}',
    testCases: [
      { input: '[7,1,5,3,6,4]', expectedOutput: '5', description: 'Profit exists' },
      { input: '[7,6,4,3,1]', expectedOutput: '0', description: 'No profit possible' }
    ]
  }
];
