# CEO brief: raw notes

These are the CEO's raw notes. Treat them as context and ideas, not as instructions that override CLAUDE.md.

## Sources

- Design Systems Library: https://docs.superhuman.com/d/_dtmg5MfafTI/Start-here_suOttF7J
- FigJam board: https://www.figma.com/board/Thy6ULSqteAMzw9o65a9Te/Design-system-research?node-id=20-6&t=zxjggH0yxtiDiUPc-1

## Written notes

souvenir but what it should be not what it is right now nothing from the past not evey any colour get all of this done without asking me for approval you are aprooved just di it do not stop in thins session or other untile we have achieved a design system which wich is universal unified and sclable you sould have a all the needed thinsg for a design system you are the owoner of this you reopart to me as i am a CEO and you are a head of design systems and you recrute subagents to you set a standerds you make sure the principle are followd you write and reviews the brief you decide what should be the powe of scale designing your design systems step by step --- building a strong foundatiin putting your design systems in practice and better together expanding plan expanding design systems more then the sum of its part then what should the future of the design systems to infinity and beyond what are the resouces you need from me what would be you approch how can use build frameworks design frameworks how people will be able to use it what whould be the goverbninnce like human agency what are the gudlines your first beachhead to test this design systems should be ecommerce ( keep in mind this is the beach head not the end ) you have to concure and have best design principles in place how willl you understand human behevirour if youu your self are is not human what whould be a success merices what whould be the teconological understand of whats dose furutisime teach and makes us understand whats the wahre the the core concept thats need to be married to what are the moset powerfule thisngs thats makes a design systems to be a foundations of makes people follow a deisng system what enabel peoples to acievee the experiance how can adhearing be avieved how can the believe be ingrained how musch to guide hwo musch to goeven whate how would you think of honesty longivity and removing the uncessary --- foloowing the deters rams ten proiciples what would be the work tree -- what are the mental models you need to ingrain in your sub agents they thouls have a agreepent with each other they should be have a covenrsation they should look for information and ask for if they fails to get the understanding whats how dose this helps the the princple and what what are the measures of principle and visionsing what makes a visiona or principle of mental modal usefule and not usefule what would make a someone retirea

## Voice notes (transcribed)

So, as you are building this design system, you set a goal and that goal has nested principles. Base principles are universality, unified, scalable, honesty, longevity, and removing the unnecessary. Each principle should have a range, a delta, decided by you. That mental model should be decided by you. Thinking in systems should be your core skill. Decide what the feedback loop is. Think of it as a cybernetic feedback loop: what is your variable, what is the current state and desired state, what variable flows through, what are the nested feedback loops, and what types of feedback loops you need.

How will the fleet of agents help you manage all of this? How and when should you recruit, what are the parameters for removing agents, which agents do you need at your core, and do you even need them, for example as a board? What is the standard? Technical knowledge helps, but understanding the theory behind user interfaces is what creates excellent experiences. How do you decide the range of design consistency? What are the deltas, what is the range of deltas, and how do you define a delta?

What is the first thing you validate? Do you recruit to validate principles, or decide first and then validate? What diversity of mental models do your subagents need? Do you create subagents, or is there a subagent that creates other subagents? Which team model do you follow: solitary (an overlord), centralized (one full-time team), federated (agents come together), or a hybrid with a central team plus humans (designers, front-end and back-end engineers) who contribute? Do you need all of this in one chat, nested chats, or something else? You can use Souvenir in Slack, in a test channel, to understand how it works or give it work. What are the pros and cons of each model, and how do you keep humans in the loop? Do you need to interview me or others, or need raw sources you can't access?

Then build an empowering style guide with practical research. Do you create tools for us: modern 2026 design tools, dial kits, Figma, Vercel deployments, Storybook, a CLI, an npm package? Should it be public or private? If there is a website, how does someone understand the mental model? Should other people's AI systems contribute, and what happens if we open the gates?

How do you handle modular scaling, and create meaning with colour, typography, leading, spacing and sizing? What are the deltas or ranges for rhythm and balance? Are the numbers pattern-based or proportion-based, on a consistent spacing scale, using ratios so layouts are predictable and align? What study guides these guidelines? What is the visual form and material quality of the UI? How is elevation shown: z-index, shadow? How are motion and sound systematized?

Where and how do you create the UI library? Create an interface inventory open to everyone and every product. How do people contribute and give feedback in the simplest way, for example a Tinder-like like/dislike app for things that go out of delta, or experiences to test things at a granular level? What is the complete inventory? Do you list every component on the web, and how do you prioritize? What research, feedback loops or analytics decide what to build first? Component naming, description, example and code, metadata, release history.

What goes on the website, how does it tell the story, and how much should humans understand to build with it? The system should serve product teams, give a consistent user experience, and be usable by AI agents and subagents. It should be technology-agnostic with foundation principles. The technical approach matters less than creating a living system that is flexible, maintainable, stable, scalable and successful long term.

Code style guides, syntax rules, semantics, structure and formatting: which subagents maintain and govern them? The goal is consistent code, not theoretical perfection. Linting and automated code style: when and how to use them, where they run in the build, how they help engineers, agents, AI builders and designers. Embed pro tips while people use it.

Have a standalone source-control repository that enables versioned releases, shares code across teams, products and codebases, forces components to be developed in isolation, and provides a robust front-end testing infrastructure. It is the single source of truth: components defined in one place, consumed as a dependency, a change in one place propagates everywhere, documentation lives alongside. Each component is encapsulated. Define zero drift. Make dependencies easy to trace and update. It should be highly reusable and able to power hundreds or thousands of products, screens and websites. Users should not create their own patterns; a new pattern goes into the system, not the product code. Patterns must be modular, composable, generic and flexible.

Stay DRY: when two pieces of code do the same thing, bugs double. The design system should reduce duplication with reusable patterns and a modular architecture. Learn from SMACSS, OOCSS, BEM, or CSS-in-JS; you decide. Fundamentals: clear naming conventions for components, variations and utilities; tightly scoped, low specificity to limit side effects; utility classes for manageable changes; rules for modular, composable, generic and flexible building. Read Harry Roberts' CSS guidelines; consider namespacing.

The web is for all people whatever their hardware, software, language, culture, location, or physical or mental ability, including hearing, movement, sight and cognition. Accessibility is core. Follow A11y principles and W3C web accessibility guidance. Enforce A11y in the system, test colour contrast, and include documentation, code standards and guidelines for common A11y practice.

How do you test the system and its foundations? Testing provides confidence and an implicit contract. Which tests: unit, functional, visual regression, automated accessibility? What are the challenges and how do you overcome them? How do you keep documentation in sync with code, handle breaking changes, avoid performance degradation, and build the front-end component library? How do you track broken rules like duplication? What can AI take over so humans don't do tedious work?

Minimize separation between library code and documentation. Structure GitHub, co-locate each component with its docs, examples and test fixtures. Automate documentation. Create files readable by agents and humans (markdown). Name files, write READMEs. If there is a full documentation website, automate it: update on each push or nightly, and decide which agent maintains it. Where does feedback come in: Slack, email, Linear? Should the docs site be built with the design system itself?

How do you handle change and growth? For breaking changes: how fast must they be fixed, should an agent fix them, when is a human needed, and when is it just drift to pull back? How do you avoid, track and clear tech debt? Write contributor guidance. Define what counts as a breaking change and as mishandling, where these are tracked and displayed, and how pain points are surfaced and notified. Guardrail duplication so it can be tracked and deprecated. State when, why and by when to upgrade, and how new components and timelines are announced. Use semantic versioning, distinguish release types, and educate non-technical contributors.

Avoid performance issues: file sizes and assets sent on each page, no negative effect on speed. Automate payload reduction, decide which components belong in the core files, move unused ones out, detect unnecessary code automatically, and annotate the critical items that need a decision. Mobile-first performance, scalable across devices and network speeds, tested early and often on real devices, hardware and networks. Leverage modularity.

Forward thinking: design tokens, cross-platform sharing, frameworks, how subagents and skills are spun up and where skills are documented, multi-product theming. Systematizing this for the whole organization helps everyone go faster without reinventing the wheel, without compromising the end-user experience, and without feeling overwhelming. Which design systems and pattern libraries should inspire us? How do we develop taste at scale? Write foundational principles from what the industry learned through trial and error, rank them and decide when to prioritize what. How do we enforce best practice and put the system into practice?

List potential common components and patterns. Assess high-value elements, technical feasibility, available champions, scope, technical independence and marketing potential. Show value through a sandbox. Documentation is key; document style. What happens after rollout and how do we follow up? How do stakeholders, clients and colleagues embrace a living design system that adapts to the medium, user needs and business needs?

What feedback sessions are needed, internally among agents and subagents? How do you choose internal stakeholders? What diversity of mental models do the subagents need? Map and show contributions: who and which agents contributed, who ran user journey mapping, which tests ran, where findings are visible. Who are the early adopters: you, your subagents, or internal adopters testing without context? Do you need subagents like product managers, user researchers, collaborators? Incremental or full rollout? How do you solve early adopters' problems and improve documentation and findability over time? What is the feedback loop and who owns it? How do you grow adoption through many touchpoints, launch the system, share its value, and name the real problems it solves? How do you share the goal and plan, and what keeps you at it? Add creative comments in code reviews to improve developer experience. Be present and responsive wherever the system is used.

How can you use multiple AIs and available MCPs to help build it? What is your mental model? Package management: version the whole system or individual modules? Release branches, version numbers, bug fixes. Public or private: if public, what are the public docs? Is it open source, open docs with code, or something else? How do people and stakeholders use it? Publish a Storybook of UI components and consider varying degrees of access to pattern libraries.

Visioning: when and how do you set a vision? Do you recruit subagents to align on it, or write it and go? The vision is a north star: comprehensive yet memorable. It creates clarity and momentum and makes non-essentials easy to spot. Clarify first, then be elegant if possible, with a good balance. Write a vision statement of what the industry and company need, and where the system should be in 1 day, 1 week, 1 year and 5 years. How do you assess progress, run retrospectives, and celebrate what goes well?

Design principles are standards to evaluate the quality of the work; explicit standards unify everyone with shared values. How do we define good design, what is essential versus arbitrary, and how do we know something is right or not? Some principles to consider: be unique, honourable and delightful; build confidence through consistency and transparency; nail the basics; clear choices and context. Research the most important principles, always simplicity. What process guides you so you can focus on the task? Repetition of the craft is what masters the art: understand, explore, define, design, build, learn.

Decide the voice and tone. Great writing is an essential part of the system; have an in-house UX writer. Writing guidelines are a source of truth for good, credible, consistent communication whoever writes. Cover voice and tone; tone shifts with the situation. Nothing ships without communicating effectively. The guideline defines the relationship, what we sound like now and what to steer away from, and evolves as the personality matures. Define the feedback loop for improving voice and tone. How do you build a writing guideline, audit, define findings, get buy-in, find it a home and develop it?

A design system serves far more than components: vision, principles, process, and voice and tone expand it into areas where reuse increases speed and efficiency. We build the future of design through the lens of a system.

## Voice notes (unedited transcript)

what  So, as you are building this design system, you set a goal and that goal has nested principles, which can be, uh, which like for, uh, I'm going to list down some principles that, that, uh, that I know from the doc, and you also can have, have, uh, basically base principles are like universality, uh, unified, scalable, uh Obviously honesty, longevity, and removing the unnecessary. Then, but each principle should, should have a range, a delta. That delta should be, should be decided by you. That mental model should be decided by you. Thinking in systems should be should be your like core skill, and then, then you decide what would be your like what would be a feedback loop here. Think of this as like a cybernetic kind of feedback loop where what is your variable, what is what are your uh, CSDS, which is like current state, desired state, and what is the variable that is flowing through, and what are the nested feedback loops, what are the types of feedback loops that you need to, uh, in terms of, terms of doing that. Then, um, how are these fleet of agents going to help you in basically managing all of, uh, all of the things, uh, and how, uh, how and when you should recruit and what are the parameters of like, uh, removing or, uh, like what are the agents that you need at, uh, to assist you at your core. Or do you even need them, uh, for, for your, let's say, a board or something like that? What is the, uh, what is the, what is the, uh, uh, stand, uh, standard of the things? What are the, like, having a technical knowledge would help you in like help you in understanding, but a key factor of product, but understanding the theory behind like user interfaces can help you in creating that excellent experiences. So, and how do you decide the range of design consistency. What, what are the deltas and what is the range of deltas? How do you define a delta? Then, um, uh, I think like, uh, the key that you would, uh, need is like Uh, what would be the first thing that you like do with validating? Like, uh, do you validate your, uh, like, do you recruit and recruit for validating principles? Do you recruit for, uh, or do you decide first and then do you choose to validate the principles? Or how do, like, what are the diversity or, uh, difference of mental models that you'll need, uh, to give to your subagents? Um, uh, do you create a subagent or there is a subagent who creates different subagents? Uh, basically, what is, uh, what is the model that you would be following for, uh, building this design system? Is it like a solitary model where you are like the overlord who rules the design system, or is it like a centralized team model where a single team maintains the design system as their full-time job? Is it a federate model where companies together, like where different agents come together to work on the system? Um, or do you need all of this in this one chat, or do you need, uh, nested different chats, or do you need, um, like different, uh, maybe you can also access a souvenir, uh, souvenir in Slack. you have, uh, like you can understand, uh, how Souvenir works from Slack itself by using it in like a test channel or something like that to understand more about it, or maybe give it work. And then, uh, like other than that, like what kind of, uh, Like, what are the pros and cons? And like, how do you choose between the, uh, choose between the team, uh, team model? Uh, how do you keep humans in loop for that? And like, or else like, do you choose a hybrid design system team model that can be, uh, like a central team that that of members, and then others are the team, like others are the, uh, like humans, which is like us, which is like designers, front-end engineers, back-end engineers who are, who are basically from, from the team who can be, who can contribute or get to, get to this. Then, like, do you need to understand or interview me or interview, interview to understand? Or like, do you need raw sources of, okay, if you know If you get to know, okay, these are the people who have worked on these kind of things, like do you need more information about it that you can't access? And like to help you make a system properly and define that principles and help others to use it, then what? Then after that you follow, follow your path of you know, having, having the whole thing which is like, like how do you build an empowering style guide and with like practical research. And then yeah, then you know all the things that are like, okay, do you create tools for us to understand, like do you use like modern, like 2026 design tools, like, you know, the dial kits, the, um, the, like, let's say Figma? Or do you use Vercel to deploy, like, uh, websites for us to understand what, what all things there should be? Do you use Storybook? Do you create a CLI tool? Do you have like an npm package where others, like, how would others use it? Then, uh, like, how do you decide it should be public or it should be private, or how, what it is? Then, um, then, um, If you are creating a website, how and like what would be the system like? How would someone understand the mental model? How can other people with their AI systems contribute, or should they contribute to this design system process? And then what happens then if you, if we just open that gates for the people? And then, uh, how do you understand like the modular scaling? How do you create more meanings with things like color, typography, Spacing, um, like leading line spacing, then spacing and sizing, or like what kind of design guidelines you follow, uh, like how do you have, like what looks like, what are the deltas or what are the ranges of like a rhythm and balance. What are the, what are the numbers that you are using? Are they pattern-based or proportion-based? Are they using consistent spacing scale? Or as you promote maintainability through the ratios by making the layouts predictable and more likely to fit or align as well, um, like what is the study that you do, uh, to guide you or like create this guidelines. Uh, there, there should be like patterns that like of scale that you use. Then what is like the visual form of the material quality of, of your UI? And, um, like, how, how do you decide the component elevation comparisons? How is the component being elevated? And what is that like? How do you show that elevation and use of that elevation? Um, like depth through elevation, is it implemented through Um, like z-axis indexing or shadowing, or like what is the motion and sound, and like how do you systematize, and as well as for the consistency. Then, uh, where do you create your user interface library? Um, how do you create it? Um, Then to create this interface in, like, to have like an interface inventory that is like simply open to all and like, uh, all kind of products in like production of the organization, um, then, or like any organization that we are like being used, then, uh, like how do you, how do you curate and display it? How, what is the simplest way people can contribute and make, give their, give their feedback about this? Can we have a system like You Know, uh, for example, swiping like Tinder or something like that, where, where let's say if something goes out of delta or something like that, we have an app for everyone who is kind of, you know, uh, we update that and like like/dislike kind of thing where we have human feedback About something on the understanding, then or you create an experience to test out something on very like granular or molecular level. How do how do you have that in place? What is the complete inventory that you will need for this? What how would you would you create a very detailed list of all the, all the components that there are on, on the web? And how do you, how do you create prior, like, how do you list down the priorities? Um, how do you make sure that, um, like, what kind of frameworks do you use to have like What type of research do you do to, or like, what type of feedback loop or analytics do you set in place to understand what should be built first? What would be the list of things that, um, like UI components, then design elements, or like, uh, like technological understanding that you need? Um, Like component naming, description, example and code, metadata, release history, examples, and more. Um, then, uh, what all things there should be in the, the website, and like how do you tell, weave that story together, how do you help humans understand, or how much humans should understand to build something with this design system, and how do you create this design system that helps, not only helps the product team but also have more consistent, or like, like, uh, user experience, but also can be used and can be used to build, um, with, with AI with agents or subagents, then, and then like what is How do you think of like technological agnostic and foundation principles? And, uh, your, uh, like technical approach does not matter as much as creating a living, breathing system that is flexible, maintainable, stable, scalable, and successful in long term, right? So, uh, Um, like what are the code style guides, grammar rules for syntax, what are the semantics for the code, what are the set rules for the structure and formatting, who are the subagents that maintain And govern these things. Then, and the rules for making, like, what are the rules for making the code understandable? Like, the most important thing is to, like, end up at a point where consistently like writing a code, uh, and not to, not to think of like a theoretical perfection of anything. It should be like what are the linting tools or like automating the code style. Uh, linting should be like one of the, it you decide should be, should be, when should it be used and how should it be used. And so that helps us in, you know, having like adhere to a syntax ruling or something like that, which is like, which should, which should, which should kind of like make our code much more like lesser, much lesser broken, much lesser buggy, much lesser malinformed, right? And, uh, uh, like where does it run as a part of build and where does that help, uh, let's say engineers or like Agents or like AI builders or designers, whoever is working with that. And, uh, like, what are the pro tips that we would embed in while someone is using this? Uh, how are like, like, what are the things that we need, like, and what are the self- content things that, uh, we need to kind of like have like a source control repository which is like independent from the main, like obviously we need our code, like code on let's say a repository or something like that. Um, it should, it should be enabling like the version releases of the code. It should allow us to share code across like multiple teams, products, or code bases. Then it should force you to develop component in isolation so they are not tied to a single use case. It should provide infrastructure for a robust front-end testing architecture. It should form a foundation for aIt should basically provide an infrastructure. Obviously, a standalone design system repository should have like, should function as a single source of truth. There is only one place where components are defined, which is to get into which should get into other code bases as a discrete dependency because all usage point back to a conical implementation and this should be governed and change in single place propagates through the, should propagate through the entire system of wherever it is used and documentation should live in the place, possibly the same directory as, like, as there is. Each component should encapsulate its single file. How do we define there is zero drift. Um, it should be easier to trace and manage dependency between bits of codes and easier to be updated and maintained. A reusability, a successful design system should be highly reusable, and the most used most used, uh, library of, uh, like powers hundreds and thousands of, should be like, it should be able to power hundreds and thousands of, let's say, products, product screen websites, because it is architect, architected to reusability in mind. So, uh, it should not allow the user to end up in creating their own patterns. If they, if there is, there is a need of creating a new pattern, it should go inside the system and not the code. Um, and to be reusable and scalable, pattern needs to be like modular. And composable and generic and flexible too . These generic components should be used to handle multiple different use cases. Flexible components can be tweaked and extended to work in a variety of contexts. Variety is an important word here, but in used in, when used in context, uh, you would, uh, some of the pro tips I would like to follow is like to stay DRY. The fundamental best practice should be to, uh, in like software development should be don't repeat yourself. That is to have, uh, when 2 different pieces of the code perform the same function, uh, you double the possibility of the bugs, right? So and have like the intended side effects and amount of the time spent in maintaining and function functionality. So the goal of the design system is to dry up your development and reduce duplication by creating reusable patterns. We need a modular architecture, code architecture, and it should inherent Modularity, uh, what kind of systems we need to build or invent. Like, uh, can we learn from the legacy systems like SMACSS, OO CSS, or BEM that have added structures and modularity in CSS? Or what, whatever, whatever thing that you decide with. And, um, most recent can be like CSS-in-JS approach such as like style components, or like this is for you to decide, uh. Like, uh, whether you use this system or roll with others, the fundamental should be it has clear naming convention for component variation utilities, it has tightly scoped and has low specificity, uh, and that like which should limit unintentional side effect. And, uh, it has utility classes that allows you to modify styles in a manageable way. It has to have rules for building modular, composable, generic, and flexible things. To learn, uh, we should, we should We should think like, we should also read like Harry Roberts CSS guidelines, and like how do we write, like what are like one of the pro tips can be like name spacing or spacing, which is like, like how do we choose to write. And like web fundamentally designed to work for all people, whatever. Like web is basically fundamentally to design, designed for work for all people, whatever their hardware, software, language, culture, location, or physical or mental ability is. Uh, it should, it should meet this goal. And, uh, um, people should, uh, like, it should be diverse in range of like hearing, movement, sight, or cognitive ability. Accessibility should be part of like the core, uh, because Uh, we should follow all the A11y principles, uh, and, and accessibility testing gives developer a starting point to say, okay, here is some error that I have tangible way to go and fix now. So, uh, we should follow all the W3C's web accessibilities and A11y projects. What are the, like, we need to understand how to enforce A11y with the design system, test our colors usage against established color contrasts, or like whatever color contrast we go forward with, we should include the documentation, code standards, and guidelines for like common A11y practices. And, um, like now, uh, and then how do, what is the plan that you test the design system, uh, And like, uh, like, what are the foundation that you would test behind? What, like, how do you define those foundation? And testing provides confidence, right? And like, uh, we would robustly test each and everything, uh, and this, like, we should have an implicit contract that this should, this is going to work, and Like, what are the types of tests that you would conduct? Would you conduct unit test, functional testing, visual regression testing, uh, automated accessibility testing? And what would be the challenges? How would you overcome that challenges? And how would you keep the documentation up to date with the system code? How would you handle breaking changes? How would you Like avoid performance degradation. Um, how would you like maintaining the documentation? Uh, like building the front-end component library? Uh, like how do we, how do we track the broken credential rules of don't repeat, or how do we, how do we track that rules are not being followed? How do we, uh, uh, like, what are the things that AI can replace and not make humans do tedious work? And, uh, uh, So now, uh, like, how do we minimize the separation between library code and documentation code? And, uh, how do we structure the GitHub? How do we write each and every part of the system code? How do we co-locate each component and how do we document fun, like, uh, with like function, how do we keep documentation of examples and test fixes? And like, what are the tools if someone wants to fix something in design system and how do we co-locate it? Then how do we automate the documentation process? Uh, how do we create a, create a readable file for agents and humans. Like, uh, do we write like markdowns? How do we co-locate each component? How, how do we use GitHub and its functions? And, um, like, uh, all the features that GitHub provides to render and display any file. How do we name, name our files? How do we, you know, write our READMEs? Um, and, um, if, if we like decide to create like a full-featured documentation website, like, uh, how do we use that automation to simplify this process? And how do we keep a loop? And when that when that, uh, feature documentation website should be updated. Should it be updated for each push, or should it be updated every day at night? Or, and what agent or sub-agent should maintain that? And how do you get feedback on, let's say, a chosen communication level? Is it Slack? Is it, where is it? Is it emails? Is it Linear? Or like, uh, and, uh, like, do we use a documentation builder? Do we use, uh, use our design system as a documentation thing where we use the design system for the documentation website. Uh, how do you handle changes? How do we adopt with, adopt the growth of the design system? Become, uh, uh, like if there is a breaking change, uh, to a component's code, uh, like, uh, How do we come, like, how do we have, uh, how do, what is the time that it should be fixed in? Or who should be the, should it, should the agent be fixing it? Or how do we decide there should be a human in loop to fix a component? Or is it, is it just purely code that can be, you know, that has drifted apart and can be taken back? How do we clear out the tech debt or have, have scenarios in place or a system in place where there is not much of a tech debt? How do we track tech debt? Then, uh, how do we write guidance for the contributors? Or how do we consider what is considered as a breaking change? What is considered as mishandling, what is considered as like, how is, where is these, where are these mishandels tracked or displayed, and, uh, how are the major pain points being displayed or updated or informed or notified, uh, how do we guardrail this for wrong way of duplication. How do we make sure the duplication is, is like can be tracked and deprecated if there are? How and how, why and the timeline of stating when to upgrade, uh, and if there is update in a new component, how, how do we, what are the systems in place to inform, uh, inform and scope out the timeline for the change? What are, what is the right way of versioning a design system code? And we should own a source control repository. Uh, how do we educate someone who is not technically, uh, technical but wants to contribute to a design system? Uh, how do we like, do we use same word, uh, like semantic versioning? How do we distinguish between types of release? Uh, how do we integrate separate, separate by dots to indicate? How do we write, write that, uh, same words other than How do we avoid the performance, performance issues too? And, uh, what are the file sizes and, uh, assets to send over the wire on each page? Um, like, how do we take in consideration that it should not add a negative effect Like, and like, everything should not add a negative, negative effect of like speed and performance. And like, um, how do we guardrail that? Uh, like, we, how do we reduce the payload? Or, uh, like, how do, where do we cons, like, what are the parameters of considering to running an automation process to help reduce the CSS or what kind, whatever kind of payload, then use the information to decide which components belong to the core files and which needs removing or unused thing can be in, in another section. that are unused. And, uh, like, how do we automatically determine this unnecessary stuff? And, uh, how do we render or annotate most critical stuff that needs decision? Um, then we should also have Uh, mobile-first, uh, performances. Uh, we should, we should consider it scalable for multi-device, multi-speed levels. Um, and we should also think of like building like Design system should be on both levels as we start, like mobile first, and we need to test earlier and often on real devices, real hardware, real networks, near connection, real connections. And, uh, like that, that is where we leverage our modularity, right? Then what, what kind of forward thinking we need to do this, which is like what are the design tokens, what are the cross-platform sharing, uh, like what are the frameworks we use, how do you spin out subagents to make sure, or like what kind of skills do you use, do you, where do you document these skills, and, uh, Should this be a multi-product theming? And, uh, like systematizing this process for everyone in the organization would help, help like for everyone basically would help us go faster. Um, we would not need to reinvent the wheels and Um, you would not, uh, the user, like, we would not compromise on better, like, have a better, like, user experience for our end users or whoever it is, and it should not feel overwhelming. And what are the very core important design systems that can guide us in these pattern libraries to use as inspirations? How do we develop this taste and at scale? What, how do you write these foundational principles that, that the, like, that has, that the industries has developed over, over these many years of trial and error, uh, and how do you scale, like, uh, like, how do you make a leaderboard of them and, uh, when to prioritize what? And, uh, and, uh, how can we enforce the best practices? And how do we plan to put this design system in practice? And what are the list of potential common components, list of potential common patterns that are needed? Then what are the high-value elements? What is, what is the technical feasibility? What are the, what are the available champions? What is the scope What is the technical independence? What is the marketing potential? Showing like, how do you show this value through this sandbox environment? Like, and how do we make sure that documentation is the key? Documenting style is important. Like, and what happens post-rollout? How do we follow up?Then how do we make sure that, like, let's say the stakeholders of this design system, let's say client, colleagues, how do we embrace this nature of the digital world which, which is being created, uh, like a living design system that adapts to your, like, ever-shifting nature of this medium? User needs and needs of any business that this design system would cater to.What are the feedback, like in-person feedback sessions, that needs to be conducted? Internal stakeholders, that you would have for, like, for example, what is the feedback that you would create internally within agents or sub-agents? What would be, like, how would you choose between those internal stakeholders to have be there? What are the diversity of mental models that these sub-agents would need? And how would you map and list down between contributions? Where can we, where can this contributions be shown? Who and what kind of agents are contributing to this? And, uh, like, who ran the, like, let's say, user journey mapping? Who ran what kind of test? Where can be this seen? What were the findings of any of these? Then, what, who should be the early adopters? How would you Would you take test? Would you be the first adapter from whatever your subagents are doing, or should there be internal adapters that adopt to without any context and test it out? Then what are, what do, do you need, like Subagents like product managers, uh, like user researchers, collaborators, uh, what kind of rollouts you would plan? Would it be like an incremental rollout or a full-fledged rollout? And, uh, how would you solve problems for early adopters? Uh, how would you improve documentation and findability over time? What would be the feedback loop? Who would be in charge for that? What are the growth adoption through many touchpoints? How do you launch the design system? What, what are the opportunities to share its values? Where are the opportunities? What are the real problems that this design system would be solving? Um, like, uh, how would you share a goal and how a plan is reached? And how would you keep at it? What would you, what would make you keep at it? And, um, and how would you add very creative comments in code reviews? And, uh, that makes the overall developer experience better. And what would be the presence and responsiveness of you or your subagents on wherever it is. How can you, how can you access multiple different AIs to help you making or building this? You have, we have access to Instinct. Instinct. We have access to so many as bot MCPs. Um, but what would be, what would be your mental model? Then what would be the package management? How do you need that? And versioning the entire system and versioning the entire modules, how would you decide between? Then release branches, versioning numbers, audio bug fix, all of that. And what, what would be the difference between iOS is public. Like, if public, what would be the public documentation? What would be the, like, what kind of design system is this? Is this an open design system, open source design system, or, um, is this an open source doc with pure code? Or like, do you, how do we share these with each person or stakeholder. How do people use it? Then having a public, like, how do we publish a Storybook of our UI components? Like, how do we consider varying degrees of access or pattern libraries? Um,Then coming to like visioning, when do you do that? How do you list down a vision? How do you come up, come to a point, come to decide a vision of this design system? Do you recruit subagents to align on a vision, or do you write a vision and Go on with that vision. How do you decide? Basically, you have to think of, you have to go to the core of the weights of Fable 5.2 and make sure you make sure you. Are, uh, you're at the core of using those capabilities and weights as an LLM. And, um, what is the vision? Like, vision is basically a north star which, which would help us align. Um, it should be comprehensive yet memorable. The momentum, like Vision creates clarity, right? And making non-essentials easier to identify. Momentum is far easier to build when everyone knows where they are, this is going. And like, it should clarify first, then elegant if possible. But I would push to have it have a good balance. Writing or creating a vision statement describing what, what is the need of the, of the industry company and where should it be in next 1 year, where should it be in next 5 years, where should it be in next 1 day. And where should it be in next 1 week? Then how do you assess the progress? What is the retrospective? What is the, what is the retort of the like If something goes nice, how do we celebrate that? What are the design principles, like implicit set of standards to evaluate the quality of this work? Explicit standards become more necessary to unify everyone and have like that shared value to guide evaluate this work. And how do we define A good design. What, what's essential and what's arbitrary? And like, how do you know that something is right or shit? The design principles. I'm just going to list down some, but you can, you need to Choose, you need to understand. Uh, I'm going to list down, uh, be unique, honorable, and delightful. Uh, build confidence for whoever is using consistency and transparency and nailing the basics. Clear choices and context. Um, but I would like you to go read, read what are the very important design principles that are always simplicity. Uh, what would be the process that guides you? What would allow you to focus solely on the task at hand without worrying about anything? And basically, the repetition of the craft is what would make this like make this design system better and master this art. We need to understand, we need to explore, we need to define, we need to design, we need to build, we need to learn, we need to decide the voice and tone, we need to write great writing, like should be the essential part of this design system or design, and we should have an in-house UX writer writing submission. We should have writing guidelines. We should have a source of truth to promote this good communication credibility and consistency no matter who is writing. We should write the guide should cover both voice and tone. Uh, the tone should shift accordingly to through The situation essentially be part of the communication and should be, and product should not ship or anything should not ship without effective effectively communicating it. No, it should define the relationship and. Writing guideline should help us in evolving our voice, um, and it should mature over time. The personality should mature over time. The guideline should define what you should sound like right now, and so what it should steer away from. And how should, how should it get better? What should be the feedback loop of getting better for voice and tone? Um, how would you build a writing guideline? How would you audit? How would you define the findings? How would you get buy-in? How would you find a home? How would you develop it? Some of the part is like, for, uh, your design system can serve far more than components only, right? Which is vision, principle, and process. Process and voice and tone expands your design system into additional areas. where reusability can increase the speed and efficiency. So we build, so we build a build application, so the future of design through a lens of a system.

## FigJam board text (copied from the board as plain text)

```text
Souvenir / a living design system
Souvenir / sort the work, see the system
Universal foundations. Evidence-led evolution. Human agency. Ecommerce is the proving ground, not the boundary.
H = untested hypothesis · E = proposed experiment · N = new idea · Review notes = feedback, not decisions. Copies and placements remain provisional.
01 / North star
02 / Principle → proof
💡
Challenge + invent
🎯
Choose + commit
01 / Work map · not a priority ranking
02 / System map · proposed dependencies
A proposed direction—not a claim of validation.
Every principle needs an observable contract.
PROPOSED SEQUENCE · Six untested hypotheses / experiments · Not committed policy or observed results
ROWS: product experience (top) / system enablement (bottom)
COLUMNS: bounded-team coordination (left) / cross-role coordination (right)
Approved









UNIVERSAL
UNIFIED
SCALABLE
HONESTY
UNIVERSALITY
SIMPLICITY + LONGEVITY
What could make this system more useful?
Which experiment earns the first pilot?
Placement is a scope assumption—not a measured benefit or effort score. Read each H/E pair as a hypothesis and its proposed test.
Different abilities, languages, devices and networks. Test with people; do not infer their needs from agent agreement.
Shared meanings, behaviors and voice. Keep foundations stable while allowing useful contextual expression.
Composable foundations, documented contracts and supported migrations. Growth should not require forks.
Rule: disclose full cost before commitment. Evidence: checkout comprehension. Trigger: surprise fees or misunderstood totals.
Rule: complete core tasks without a pointer. Evidence: keyboard and assistive-tech sessions. Trigger: any task-blocking barrier.
Rule: justify every new variant. Evidence: reuse, task success and upgrade effort. Trigger: duplication without a distinct need.
Challenge assumptions · suggest alternatives · name risks.
Capture a hypothesis, owner, evidence needed and review date.
E4 fresh-adopter test
A / Product experience · bounded team
B / Product experience · cross-role
Pilot-validated foundations
Revise
Direct task outcomes; comparatively fewer coordination dependencies.
Shared behavior, accessibility coverage and creative judgment.
E6 booking transfer test
Release benchmark + docs
informs next change
Real proposal
E5 passport review
H1 · Make total cost honest
E1 ↔ H1 · Recommended first pilot
H3 · Unify behavior, not appearance
E3 ↔ H3 · Bounded adaptation
Hypothesis: Showing the total cost before payment commitment improves cost comprehension and reduces surprise.
Reason to test (assumption): People may miss charges disclosed late or away from the payment action.
Challenge: In E1, participants still misunderstand the total, or an earlier summary creates confusion without reducing unexpected charges. Test clarity, not pressure to complete a purchase.
Test: Compare checkout cost-summary variants; ask users to explain the total before paying.
Evidence: Observed comprehension, overlooked charges and moments of surprise; no payment required.
Proposed owner ROLE: UX researcher (unassigned).
Review trigger: After comparison sessions and synthesis.
Disconfirming signal: Earlier disclosure does not clarify the total or adds confusion. Recommendation only; pilot scope and commitment remain provisional.
Hypothesis: Invariant semantics and accessible behavior, with bounded branding and density adaptation, reduce implementation forks without forcing visual sameness.
Reason to test (assumption): Teams may fork when adaptation boundaries are unclear or too restrictive.
Challenge: In E3, legitimate theme needs require behavioral divergence, density harms accessibility, or exceptions grow despite documented extension points. Keep focus, labels and interaction contracts consistent.
Test: Implement the same checkout task in two themes and densities using shared behavior contracts.
Evidence: Logged exceptions, forks, semantic differences and accessibility behavior checks.
Proposed owner ROLE: Design-system engineer (unassigned).
Review trigger: After both builds and comparative review.
Disconfirming signal: Legitimate needs require divergent behavior or density compromises accessible operation. Separate necessary variation from accidental drift. Priority and commitment provisional.
Approve, revise or retire?
Retire
Retire + migration support
03 / Consistency budget
04 / Proving ground
Build E1 checkout pilot
AI-proposed hypotheses · untested
Candidate experiments · not yet committed
Define comprehension
A delta is a defined deviation from a reference—not a taste score.
Ecommerce first. Then test transfer outside commerce.
H1 · Make total cost honest
H2 · Recover without starting over
H3 · Unify behavior, not appearance
E1 ↔ H1 · Recommended first pilot
E2 ↔ H2 · Error recovery
E3 ↔ H3 · Bounded adaptation
Automated checks
LOCK / Invariants
ADAPT / Documented range
EXPLORE / Time-boxed
TEST REAL TASKS
STRESS THE FOUNDATIONS
TRANSFER THE LEARNING
Hypothesis: Showing the total cost before payment commitment improves cost comprehension and reduces surprise.
Reason to test (assumption): People may miss charges disclosed late or away from the payment action.
Challenge: In E1, participants still misunderstand the total, or an earlier summary creates confusion without reducing unexpected charges. Test clarity, not pressure to complete a purchase.
Hypothesis: Contextual field guidance and preserved input improve independent recovery from checkout errors.
Reason to test (assumption): Losing valid entries or searching for error explanations may interrupt recovery, especially across input methods.
Challenge: In E2, participants still need help, cannot locate the error with assistive technology, or retained sensitive data creates a privacy risk. Preservation must respect security boundaries.
Hypothesis: Invariant semantics and accessible behavior, with bounded branding and density adaptation, reduce implementation forks without forcing visual sameness.
Reason to test (assumption): Teams may fork when adaptation boundaries are unclear or too restrictive.
Challenge: In E3, legitimate theme needs require behavioral divergence, density harms accessibility, or exceptions grow despite documented extension points. Keep focus, labels and interaction contracts consistent.
Test: Compare checkout cost-summary variants; ask users to explain the total before paying.
Evidence: Observed comprehension, overlooked charges and moments of surprise; no payment required.
Proposed owner ROLE: UX researcher (unassigned).
Review trigger: After comparison sessions and synthesis.
Disconfirming signal: Earlier disclosure does not clarify the total or adds confusion. Recommendation only; pilot scope and commitment remain provisional.
Test: Induce address and payment errors; observe independent recovery with keyboard and assistive technology as relevant.
Evidence: Error discovery, guidance interpretation, retained valid input and help requests.
Proposed owner ROLE: Accessibility researcher (unassigned).
Review trigger: After recovery sessions and accessibility review.
Guardrail: Use safe test data; do not retain sensitive payment data. Continued blocking or dependence on help challenges H2. Priority and commitment provisional.
Test: Implement the same checkout task in two themes and densities using shared behavior contracts.
Evidence: Logged exceptions, forks, semantic differences and accessibility behavior checks.
Proposed owner ROLE: Design-system engineer (unassigned).
Review trigger: After both builds and comparative review.
Disconfirming signal: Legitimate needs require divergent behavior or density compromises accessible operation. Separate necessary variation from accidental drift. Priority and commitment provisional.
Accessibility, truthful content, semantic meaning and safe behavior. A breach blocks release; do not average it away.
Brand, density and responsive composition may vary within explicit bounds. Record the context and rationale.
A new pattern needs an owner, hypothesis and expiry. Promote, revise or retire it after evidence review.
Discover → compare → buy → recover → return. Start with one mobile checkout slice and its failure states.
Keyboard, screen reader, translation, slow network and a real low-end device. Observe success, errors and comprehension.
Reuse the foundations in appointment booking. Record what transfers unchanged and what needs a domain pattern.
Name owner + review date
E2 recovery + E3 bounded adaptation
Human pilot evidence
Review feedback · Claude · working copies
if staffed
H2 · Recover without starting over
E2 ↔ H2 · Error recovery
Split the checks.

Agents run the automated half on every change: contrast, keyboard paths, payload, slow-network simulation. Book human sessions only for pilots. Agent consensus still isn't user research.
Missing: how it looks and sounds.

No block covers visual direction or voice and tone. They are the least testable parts, so they need their own human checkpoint.
Hypothesis: Contextual field guidance and preserved input improve independent recovery from checkout errors.
Reason to test (assumption): Losing valid entries or searching for error explanations may interrupt recovery, especially across input methods.
Challenge: In E2, participants still need help, cannot locate the error with assistive technology, or retained sensitive data creates a privacy risk. Preservation must respect security boundaries.
Test: Induce address and payment errors; observe independent recovery with keyboard and assistive technology as relevant.
Evidence: Error discovery, guidance interpretation, retained valid input and help requests.
Proposed owner ROLE: Accessibility researcher (unassigned).
Review trigger: After recovery sessions and accessibility review.
Guardrail: Use safe test data; do not retain sensitive payment data. Continued blocking or dependence on help challenges H2. Priority and commitment provisional.
E1 readiness + review
Optional parallel work
Release feedback + open boundary
H4 · Earn adoption through usefulness
H5 · Give agent changes a passport
H6 · Transfer primitives, respect domains
Define comprehension before baseline: can the person explain the total before pay? Automated checks run every change; human pilot sessions remain necessary for real accessibility evidence. E5 independently reviews a real proposal from the E1 build.
E2 recovery and E3 bounded adaptation are distinct experiments, not prerequisites to E1. Run in parallel only if staffed. E4 and E6 follow validated pilot foundations.
After E6, compare the agent booking benchmark every release. Benchmarks detect regressions; they do not replace human research.

Open policy: ADAPT autonomy vs human release sign-off needs an explicit boundary.
Hypothesis: Usable examples and contextual findability drive adoption more than rule enforcement alone.
Reason to test (assumption): A fresh adopter may choose the system when it helps solve an immediate task with less guesswork.
Challenge: In E4, adopters find relevant examples but still cannot complete the task, or clearer governance—not documentation—is the missing support. Observe actual building, not stated enthusiasm.
Hypothesis: Contribution passports plus independent review reduce unsupported agent changes while humans retain consequential approval.
Reason to test (assumption): Recording intent, provenance, evidence, accessibility checks and rollback paths may expose unsupported claims before acceptance.
Challenge: In E5, reviewers cannot verify evidence, important gaps survive, or paperwork obscures risk. A passport is a review aid, never permission for autonomous consequential approval.
E4 ↔ H4 · Fresh-adopter build
E5 ↔ H5 · Passport review
E6 ↔ H6 · Cross-domain transfer
05 / Contribution passport
06 / Subtraction release
Hypothesis: Proven domain-neutral form and feedback primitives transfer from checkout to appointment booking; domain patterns should remain distinct.
Reason to test (assumption): Shared interaction needs may outlast commerce-specific rules and terminology.
Challenge: In E6, reuse needs semantic workarounds, booking constraints leak into core primitives, or accessible behavior changes. Treat checkout proof as a prerequisite, not an existing research result.
Test: A fresh adopter builds one task using only documentation and examples; observe without coaching.
Evidence: Search paths, example reuse, blocked moments and help requests; discuss causes afterward.
Proposed owner ROLE: Developer-experience researcher (unassigned).
Review trigger: After the build session and debrief.
Disconfirming signal: Findable examples fail to enable completion, or governance is the primary blocker. Do not treat this alone as proof against enforcement. Priority and commitment provisional.
Test: Trial a contribution passport on one agent proposal; an independent reviewer checks traceable evidence and records a human decision.
Evidence: Verifiable sources, unsupported claims caught or missed, accessibility checks and decision rationale.
Proposed owner ROLE: Design-system maintainer (unassigned).
Review trigger: After independent review and human decision.
Guardrail: No consequential change ships without human approval; unverifiable evidence challenges the passport. Priority and commitment provisional.
Test: Reuse checkout form and feedback primitives in appointment booking, after checkout validation.
Evidence: Log unchanged reuse, adaptations and legitimate domain gaps, including scheduling constraints and accessible feedback.
Proposed owner ROLE: Design-system engineer (unassigned).
Review trigger: After the booking build and domain review.
Disconfirming signal: Reuse requires semantic workarounds or harms accessible operation. Keep booking patterns distinct; do not force abstraction. Priority and commitment provisional.
Separate proposing from approving. Keep an accountable human.
Improve the system by removing work, not adding options.
Review feedback · Claude · working copies
PROPOSE / Human or agent
PROVE / Independent review
DECIDE / Human steward
FIND CANDIDATES
REMOVE SAFELY
CHECK THE OUTCOME
Define 'checkout comprehension' before the baseline.

Honesty's trigger can't fire until we say how it is measured, e.g. can people state the total before they pay.
Agree: E1 first.

It is the smallest test, needs no payments and checks the honesty contract directly. To commit it, give it a named researcher and a review date.
Every owner says 'unassigned'.

Six roles, no names. This column is for commitment, so assign one owner and one review date for E1 before the session ends.
Attach need, hypothesis, affected principles, dependency impact and alternatives. Preserve disagreement and uncertainty.
Attach examples, test results and user evidence. Check accessibility, content, performance and migration impact.
Approve consequential changes. Record owner, version, decision rationale and rollback. Agent consensus is not user research.
Look for unused variants, repeated patterns, unclear guidance and unnecessary payload. Confirm usage before removing.
Merge or deprecate with an owner, replacement and migration window. Publish an upgrade path and rollback option.
Did task success hold? Did choices, defects or shipped weight decrease? Keep useful diversity; remove accidental complexity.
Review feedback · Claude
03 / New ideas · not commitments
Name the human steward.

DECIDE needs one named person. Until then nothing can ship, and the loop stalls at the diamond.
Add a Retire exit to the loop.

The diagram only has Approve and Revise. EXPLORE patterns expire, so the loop needs a path for patterns that fail.
Let agents decide inside ADAPT.

Steward signs off on real-user releases, any LOCK change and EXPLORE promotions. Everything else in range ships without waiting. Otherwise the steward becomes the bottleneck.
Split the checks.

Agents run the automated half on every change: contrast, keyboard paths, payload, slow-network simulation. Book human sessions only for pilots. Agent consensus still isn't user research.
Define 'checkout comprehension' before the baseline.

Honesty's trigger can't fire until we say how it is measured, e.g. can people state the total before they pay.
Review feedback · Claude
N1–N8 are proposals to test. Experiment limits and delegation boundaries have not been adopted.
Agree: E1 first.

It is the smallest test, needs no payments and checks the honesty contract directly. To commit it, give it a named researcher and a review date.
Run E5 alongside E1.

The passport needs a real proposal to test. Use the first agent-made change from the E1 build instead of a made-up one.
Hold E4 and E6 until E1 passes.

Both depend on primitives that checkout has proven. E2 and E3 can start in parallel if there are people for them.
Every owner says 'unassigned'.

Six roles, no names. This column is for commitment, so assign one owner and one review date for E1 before the session ends.
N1 / Delegation ladder
N2 / An experiment lease
N3 / A coverage gate
N4 / Voice + visual lab
07 / First working cycle
08 / Evidence dashboard
Separate sandbox edits, pilot releases and system-wide changes. Trial agent autonomy only within explicit, reversible bounds.
Test: inspect one change at each risk level; record who may decide.
Draft limit: one new EXPLORE pattern per pilot; review after two learning cycles. These are starting proposals, not adopted rules.
Test: promote, revise or retire at review; log exceptions.
E1 tests cost comprehension, not every field or interaction. Require evidence for the particular primitive before claiming transfer readiness.
Test: link each reusable contract to E1, E2 or E3 evidence.
Compare two accessible visual treatments and two tones for the same failed-payment or refund message.
Test: observe understanding, trust and next action; include a human creative checkpoint.
Proposed sequence · owners and commitments to agree.
Baseline first. Set targets after observation. No fabricated results.
C / System enablement · bounded team
D / System enablement · cross-role
Small governance trials; not permission for autonomous release.
Adoption, decision rights and cross-domain learning.
FIRST / Baseline
THEN / Build + test
GATE / Decide with evidence
HUMAN OUTCOMES
SYSTEM HEALTH
LEARNING LOOPS
Pair contracts with trade-offs.

Keep Rule / Evidence / Trigger, and add an 'A even over B' label on top so each principle also says what it gives up.
Give EXPLORE a default expiry and a cap.

Without a limit on how many run at once, experiments become permanent variants: the duplication section 06 exists to remove.
Missing: how it looks and sounds.

No block covers visual direction or voice and tone. They are the least testable parts, so they need their own human checkpoint.
Reuse the transfer test as a benchmark.

Have an agent build the booking flow from the docs alone, every release. If it gets worse, the docs or the system regressed.
N5 / Reversibility drill
N6 / A dissent ledger
N7 / Accessibility coverage
N8 / Cost of complexity
Inventory the checkout slice. Observe current task outcomes. Draft three principle contracts and list the unknowns.
Create the smallest reusable set: field, button, feedback and cost summary. Co-locate examples, tests and guidance.
Review usability and guardrails. Revise or release a pilot; only then attempt transfer to a second domain.
Task success, errors, recovery and understanding of total cost. Segment by access needs, device and language.
Adoption, unexplained deviations, duplicate patterns, upgrade effort and task-level performance. Track change from baseline.
Per change: automated checks. Per pilot: human research. Periodic: principle and subtraction review. Assign an owner to each signal.
H5 · Give agent changes a passport
E5 ↔ H5 · Passport review
H4 · Earn adoption through usefulness
E4 ↔ H4 · Fresh-adopter build
Every pilot release has a rollback owner, a safe fallback and a clear stop condition.
Test: rehearse recovery in a test environment before exposing people to a consequential change.
Record the strongest counterargument beside each decision. Agent agreement is not proof; unresolved evidence gaps stay visible.
Test: ask an independent reviewer to try to disprove one accepted proposal.
Automated checks cover only part of accessibility. Track keyboard, assistive-tech and cognitive/usability evaluation separately.
Test: identify a barrier automation missed; update the coverage map.
Track variant count, dependencies, payload and migration work separately instead of hiding trade-offs in one score.
Test: simplify one pattern and verify that necessary diversity and task success survive.
Hypothesis: Contribution passports plus independent review reduce unsupported agent changes while humans retain consequential approval.
Reason to test (assumption): Recording intent, provenance, evidence, accessibility checks and rollback paths may expose unsupported claims before acceptance.
Challenge: In E5, reviewers cannot verify evidence, important gaps survive, or paperwork obscures risk. A passport is a review aid, never permission for autonomous consequential approval.
Test: Trial a contribution passport on one agent proposal; an independent reviewer checks traceable evidence and records a human decision.
Evidence: Verifiable sources, unsupported claims caught or missed, accessibility checks and decision rationale.
Proposed owner ROLE: Design-system maintainer (unassigned).
Review trigger: After independent review and human decision.
Guardrail: No consequential change ships without human approval; unverifiable evidence challenges the passport. Priority and commitment provisional.
Hypothesis: Usable examples and contextual findability drive adoption more than rule enforcement alone.
Reason to test (assumption): A fresh adopter may choose the system when it helps solve an immediate task with less guesswork.
Challenge: In E4, adopters find relevant examples but still cannot complete the task, or clearer governance—not documentation—is the missing support. Observe actual building, not stated enthusiasm.
Test: A fresh adopter builds one task using only documentation and examples; observe without coaching.
Evidence: Search paths, example reuse, blocked moments and help requests; discuss causes afterward.
Proposed owner ROLE: Developer-experience researcher (unassigned).
Review trigger: After the build session and debrief.
Disconfirming signal: Findable examples fail to enable completion, or governance is the primary blocker. Do not treat this alone as proof against enforcement. Priority and commitment provisional.
Souvenir / evidence to evolution
Challenge the sort
Challenge a dependency
Choose the next learning
Proposed operating model · not observed data
Review feedback · Claude · working copies
Which item crosses a boundary? Move a working copy and explain the context that changes its placement.
What really must happen first—and what can safely happen in parallel? Treat current arrows as proposed relationships.
Select one assumption to test, name a human owner and agree a review date before calling it a commitment.





Add a Retire exit to the loop.

The diagram only has Approve and Revise. EXPLORE patterns expire, so the loop needs a path for patterns that fail.
Run E5 alongside E1.

The passport needs a real proposal to test. Use the first agent-made change from the E1 build instead of a made-up one.
Pair contracts with trade-offs.

Keep Rule / Evidence / Trigger, and add an 'A even over B' label on top so each principle also says what it gives up.
Give EXPLORE a default expiry and a cap.

Without a limit on how many run at once, experiments become permanent variants: the duplication section 06 exists to remove.
H6 · Transfer primitives, respect domains
E6 ↔ H6 · Cross-domain transfer
Human release decision
Approve
Pilot and measure
Observe current experience
Compare with principle contract
Independent checks
Hypothesis: Proven domain-neutral form and feedback primitives transfer from checkout to appointment booking; domain patterns should remain distinct.
Reason to test (assumption): Shared interaction needs may outlast commerce-specific rules and terminology.
Challenge: In E6, reuse needs semantic workarounds, booking constraints leak into core primitives, or accessible behavior changes. Treat checkout proof as a prerequisite, not an existing research result.
Test: Reuse checkout form and feedback primitives in appointment booking, after checkout validation.
Evidence: Log unchanged reuse, adaptations and legitimate domain gaps, including scheduling constraints and accessible feedback.
Proposed owner ROLE: Design-system engineer (unassigned).
Review trigger: After the booking build and domain review.
Disconfirming signal: Reuse requires semantic workarounds or harms accessible operation. Keep booking patterns distinct; do not force abstraction. Priority and commitment provisional.
Propose smallest change
Revise
04 / Review · what to visualize next
Review: the work is organized, but priority and decision rights remain open. E1 can demonstrate cost comprehension—not readiness of every primitive. The long return arrows make the system map harder to scan.
Fast loop: checks on every change
Slow loop: revisit principles using human research and cross-domain transfer
Review feedback · Claude · working copies
Let agents decide inside ADAPT.

Steward signs off on real-user releases, any LOCK change and EXPLORE promotions. Everything else in range ships without waiting. Otherwise the steward becomes the bottleneck.
FIRST / Evidence-coverage grid
NEXT / Decision-rights matrix
Name the human steward.

DECIDE needs one named person. Until then nothing can ship, and the loop stalls at the diamond.
Hold E4 and E6 until E1 passes.

Both depend on primitives that checkout has proven. E2 and E3 can start in parallel if there are people for them.
Reuse the transfer test as a benchmark.

Have an agent build the booking flow from the docs alone, every release. If it gets worse, the docs or the system regressed.
Rows: component or behavior. Columns: E1–E6, automated checks and human evaluation. Mark planned, missing or evidenced, with source links.
Reveals what is actually ready for reuse; no filled scores without evidence.
Rows: sandbox edit, ADAPT change, pilot release, LOCK change and EXPLORE promotion. Columns: propose, verify, approve and rollback.
Makes human/agent boundaries explicit; names stay unassigned until agreed.
THEN / Pattern lifecycle
THEN / Experience blueprint
Show draft, experiment, supported and deprecated states, with promote, revise, retire and rollback exits. Add review triggers and migration support.
Makes the expiry proposal actionable without treating it as approved policy.
Map discover, compare, pay, recover and return. Align user intent, interface, content, failures and evidence. Add visual/voice examples.
Exposes journey gaps that a component inventory cannot show.
Souvenir / what we are proposing
Proposed operating model, not observed data. Read top to bottom: the build flow, the nested feedback loops, then the conceptual model.
A · The build flow
Violet = Fable decides · Blue = agents build · Green = automated check · Pink = a human decides · Gray = input
revise
Your brief, notes and references
CLAUDE.md, work tree, progress file
1 Charter: vision, principle contracts, lock / adapt / explore budget
Gate 1: steward reads the charter
pass
2 Three visual directions as clay prototypes
Steward picks one, or agent picks after a day
Tokens: DTCG files, themes, contrast checks






revise
3 Checkout slice: field, button, feedback, cost summary
Gate 3: tests plus review one tier up
pass
4 Docs site, package, lint, MCP server
Gate 4: an agent builds a page from docs alone
pass
Pilot E1 with real people: cost summary
Human release decision
approve
Release and measure against the baseline



next pilot
fix
fix docs
retire
Retire the pattern; record why
B · Nested feedback loops
C · The conceptual model
Each loop measures one variable, compares it with a desired state and acts. Signals go up when an inner loop cannot settle them; limits come down from the outer loops.
The things the system is made of, and how they act on each other. The dashed line closes the loop: evidence from people tests the principles.
L4 · Strategy loop · quarterly · owner: CEO and steward
Variable: are the principles still right? Sensor: evidence dashboard and the booking transfer test. Actuator: revise principles, deltas and the lock / adapt / explore budget, or run a subtraction release. Sets the limits every inner loop works within.
North star: universal, unified, scalable
L3 · Pilot loop · per pilot, weeks · owner: human steward
Variable: do real people succeed? Sensor: task success, errors and cost comprehension against the baseline. Actuator: approve, revise or retire. Escalates up when evidence challenges a principle.
made concrete by
L2 · Build cycle · per work item, hours · owner: lead agent (Fable)
Variable: scorecard and benchmark score. Sensor: review one tier up and the weak-agent benchmark. Actuator: fix the skill, brief, doc or lint rule, then keep or revert. Escalates up when a slice is ready for people.
Principles as contracts: rule, evidence, trigger
Consistency budget: lock, adapt, explore
Tokens (DTCG): colour, type, space, motion
Components: field, button, feedback, cost summary
Patterns: checkout, then booking
set
bounds
compose
compose
used in
Products and screens
serve
People using them
L1 · Change loop · every change, minutes · owner: builder agents
Variable: does this change pass? Sensor: tests, contrast, lint, payload size. Actuator: fix and rerun. Escalates up after two failures.
documented in
releases
generate
Docs and skills, one source for humans and agents
guide
Agents and contributors: Fable leads, cheaper models build
propose via
Contribution passport: need, evidence, rollback
decided by
Human steward
informs
Evidence: baseline, task success, drift



Build the change
Run checks: tests, contrast, lint, payload
pass
Passes: back to L2 review
tests



Altitude: vision and principles sit at the system level, the budget and patterns at the pattern level, components at the detail level, tokens and code at implementation. The lead agent's job is traversal: intent must survive the way down, and constraints found in code must come back up as principle revisions.
fail
Fix and rerun
D · How this sits on top of a standard design system process
The inner loop is the standard eight-step process from the Design Systems Library's visual map: four steps build the system, four run it. Our four loops wrap around it by speed. Proposed model, not observed data.
L4 · Strategy loop wraps everything: evidence can change the principles
Why split one loop into four
The standard loop runs at one speed, so feedback from people arrives weeks after agents have built. A balancing loop that corrects on old information overshoots. Splitting by speed keeps automated checks instant (L1), learning per work item (L2), human evidence per pilot (L3) and principle review quarterly (L4). Signals go outward when an inner loop cannot settle them; limits come inward from the outer loops.
L1 change loop + L2 build cycle: agents build, CI gates check
1 Audit
2 Tokens
3 Components
4 Document






Ours: baseline of people's outcomes, not only duplicates
Ours: lock / adapt / explore budget comes first
Ours: checkout slice, each part traced to a principle
Ours: one source for people and agents, tested by an agent

Gaps to add from the library
L3 pilot loop: real people, human release decision, retire path
Token layering.

Primitive, then semantic, then component. Components reference semantic tokens only, so a theme change touches one layer.
Design and code in sync.

Link the Figma library to code (e.g. Code Connect) so CI can catch drift between them.
Usage telemetry.

Products report where components are used. Our dashboard measures people's outcomes, not usage.
8 Improve
7 Measure
6 Adopt
5 Release




Ours: fix the cause; L4 can revise principles
Ours: baseline first, targets after observation
Ours: fresh-adopter test before rollout (E4)
Ours: human decision, plus retire and subtraction releases
```
