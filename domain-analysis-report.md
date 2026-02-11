# Domain Analysis Report

## Introduction
The domain analysis in this document is constructed for a pet minder application that helps pet owners and pet minders have a safe hub to find one another. This application will be targeted for all types of users over the age of 13, as this is the legal age that a person’s data such as locational data (which is something we will consider) can be tracked and processed as seen in Article 6 of the GDPR [1]. This document describes the current struggle and need for pet owners and minders in finding one another through strong, vigorous research and analysing domain on the topic. The information we will explore will be used in the process of a web application that can be used on a mobile device as well to keep a consistent and portable software for people of all groups.

### Domain Outline and Problem
After the completion of our research, it was uncovered that over the course of lockdown and past this time the number of pet owners had increased, for example 31% of people who acquired a dog or cat in this period had not considered becoming a pet owner before lockdown [2]. This came with obvious consequences as stated in this paper by Battersea that a majority of these pet owners were working from home and able to take care of their pets. But with the lockdown regulations easing down and offices opening back up, there were no options for looking after their pets and this grew increasingly worse as more jobs were opening as time went on meaning more unattended pets.

To add to this, over the course of the last year there has been an increase in the unemployment rate of people aged 16 to 64 from 4.4% to 5.1% meaning an increase of around 280,000 people [3]. Meaning that more people would be inclined to start working as a pet minder, making it so our app actually opens up many job positions for people of all backgrounds. Like that of a taxi service app creating jobs like uber or bolt but rather pet minders.

Pet owners will feel motivated to use this software as it will provide a simple structure to find pet minders at no expense to search. Whilst also helping build trust with users as there will be a strong review system as well as a verification system in place too, for both pet owners and minders. Providing location tracking and clear instructions to ensure security on top of other security measures in place. Pet owners and minders will be matched with one another based off location to keep all work localised and an overall more friendly experience.

### How the Software Solves the Problem
The goal of the proposed application is to provide a centralised platform that connects pet owners with verified pet minders. Rather than relying on informal arrangements or personal contacts, owners can create profiles for their pets and search for minders based on location, availability, experience, and ratings. This helps them find suitable and trustworthy care more quickly. Minders can also create profiles and set their availability, allowing both parties to be matched efficiently and reducing the time spent searching manually.

To improve trust and safety, the platform uses profile verification, testimonials and a two-sided review system so users can make decisions based on previous feedback. Booking and scheduling features allow owners to request services while minders can accept, decline or reschedule jobs, helping to reduce misunderstandings. Owners can also provide care instructions and activity tracking during walks allows them to monitor their pets while services are taking place.

By combining matching, communication, scheduling and monitoring in one mobile-accessible application, the software provides a practical solution that helps ensure pets are properly cared for while also creating flexible work opportunities for pet minders.

## Customers and Users
The Pet Minder is an application designed to benefit both the Pet Owner and Pet Minder by facilitating the matching and maintenance of the connections. The system consists of three primary user groups, the Administrator, the Pet Owner and the Pet Minder.

### Administrators
The administrator is at the top of the organisational hierarchy as they govern the system by managing the user permissions of both the pet owners and pet minders meaning they have more access permissions compared to the other users. They are usually someone who works in operations with strong technical understanding as they will need to understand the system and resolve conflicts.

One of the main jobs of the admin is ensure quick error resolution. This includes seeing all users as a potential liability and making sure every part of the sign-up process and even maintaining an account requires verification and ensures that the pet minder is credible and reliable and that pet owners have pet information up to date. It is also about monitoring platform stability, as glitches can cause scheduling conflicts and provide unreliable data which can cause discomfort and anxiety to users which could lead to the platform losing them. When dealing with reviews any potential danger should be flagged and investigated and fraud should be detected by tracking fake accounts and identifying malicious and possibly repeated reviews.

As the middleman between the pet owners and pet minders they provide support and ensure all accounts meet the platform’s standards. If it is seen that an account falls short i.e. missing medical information, missing training the administrators must flag it. When having disputes between pet minders and pet owners the administrator is the voice of authority and can decide payment issues and whether to leave or remove comments based on data reviewed.

### Pet Owners
Pet owners are the customers who access the system to find a pet minder. Before booking any activities for their pet, they must create a profile for them with their information. The pet profile can include medication, dietary requirements and their typical schedule and feeding times. In this system they act as the client who books an activity and provides care instructions for their pets, to which the pet minder should adhere. Instructions can highlight important parts of their profile, such as allergies and include other requests. Pet owners pay pet minders on the platform and can rate and review them.

* **Persona A: Takes frequent holidays**
    * *Background:* Middle income, loves travelling, very sociable.
    * *Attitude:* Highly reliant on minder, trusts reviews and ratings.
    * *Relationship:* Builds a strong partnership with minder as they have a recurring relationship.
* **Persona B: Busy worker**
    * *Background:* High income, doesn’t have much extra time.
    * *Attitude:* Highly cautious, may check GPS regularly.
    * *Relationship:* Very meticulous about the care of their pet and manages the minder.

### Pet Minder
Pet minders are users who access the system to advertise their services so that pet owners can book their activities. They can have different levels of experience and provide different activities like pet walking or pet sitting specifying what animals they work with. This could range from a part-time worker who only walks dogs and is looking to get some extra money to a professional in the pet care industry who can work with a wide range of animals and can pet sit.

They are expected to keep an activity log of the session and send it to the pet owner. This can be as simple as a photo of the route taken on a walk, or a short summary for a sitting. If anything notable happens, this can be mentioned in the activity log as well. Pet minders set their price and get paid by pet owners on the platform and can rate and review them.

Unregistered pet minders can be a secondary persona. While they don’t directly use the platform, they are impacted by the app by losing customers to pet minders who do.

* **Persona C: Professional pet sitter**
    * *Background:* Has professional training or is either a vet or has studied a subject related to animals.
    * *Attitude:* Since they have specialties and can accommodate more instructions, they would charge a higher fee and consider the app a platform for their main job.
    * *Relationship:* They see administration as a partner and act as a consultant to pet owners as they follow requests but also give more suggestions.
* **Persona D: Part-time walker**
    * *Background:* Student or someone looking for extra cash.
    * *Attitude:* Focused on taking as many shifts as possible near where they are located and fitting it around their schedule.
    * *Relationship:* Sees pet owner as their source of income.

### Other Users
These other users are tertiary users as they don’t use the app, but it can affect them. For example, emergency contacts are provided when a user signs up. The pet owner gets consent from the contact before providing it. While they won’t interact with the system directly, they may be contacted in case of emergency. They are typically a family member, friend or neighbour of the pet owner and would be considered a secondary beneficiary as they are only involved if they are unable to get in contact with the primary contact (the pet owner) and are there as a safety net.

Vets would be able to use information on the app such as medical details, care instructions and activity logs to diagnose a pet and use data from the system provided by the pet owner as an external source of information.

## The Environment
Existing applications in the pet minding domain, such as Rover and Wag!, typically operate cross both mobile and web environments. Their mobile apps are deigned to support real-time features such as live tracking, messaging and on the go updates, which are essential for minders who spend much of their time outdoors. However, these platforms also maintain fully functional web interfaces that allow users to manage bookings, review minder profiles and update account information. This shows that the domain does not rely exclusively on mobile applications. Instead, it supports a hybrid model in which users expect access across multiple devices depending on their situation. The presence of both mobile and web versions in the existing systems indicate that accessibility and flexibility are important factors for users in this domain.

While native mobile applications offer advantages for real time interaction, a web-based environment is far better suited to the needs of a pet minding application. Our system involves multiple user groups such as pet owners, minders and admins, who interact with the platform in different ways across different devices. A responsive web application allows each group to access the system without installing anything, reducing any problems for occasional users such as owners who may only book a minder infrequently. Many core tasks, such as writing detailed care instructions, reviewing profiles, managing bookings or handling admin are also more suited to be performed on larger screens, making a web interface more practical than a mobile only solution.

A web application also supports seamless transitions between devices, allowing a minder to accept a job on a laptop and later check the instructions or start tracking from their phone. This flexibility is difficult to achieve with native apps, which use a single primary device. Additionally, web applications update instantly for all users, which is essential for a system that includes features like real time tracking and booking changes. In contrast, mobile apps require users to install updates and rely on app store approval processes, which slows down the release of important fixes. It can also be quite inconvenient for those who use the service occasionally or who are less confident with technology. These factors make web applications suitable for services where both frequent and occasional users need quick, reliable access without any additional setup.

For these reasons, our application will be developed as a responsive web application using Next.js, with Vercel hosting our server-side API routes and Supabase providing database, authentication and real time data services. This environment ensures that the system functions consistently across desktops, laptops and mobile devices, allowing both pet owners and minders to access the platform in the way that suits them best. Next.js supports fast loading times and secure server-side operations, which is important for handling user accounts, bookings and location-based features. Supabase enables real time updates, allowing us to implement changes directly within the browser. Deploying on Vercel ensures that the application remains scalable and responsive as the number of users grows, providing a stable foundation for future expansion. Pet owners and minders require a platform that is easy to access, simple to use and reliable across different devices. A responsive web application meets all these requirements while avoiding the complexity and burden that comes with maintaining mobile environments.

## Tasks and procedures currently performed


### Sign up (Pet Owner & Pet Minder)
User registers an account and selects what user type they are, i.e., being a pet owner or minder or both. It will also ask them for their name and general location. During sing up the user provides basic authentication details and credentials such as a password and 2FA.

### Login (Pet Owner & Pet Minder)
Registered users log into the app to access their profile, bookings and activity history.

### Create / Maintain Pet Profile (Pet Owner)
Once registered the user will be prompted to create a pet profile(s) if they have selected that they are a pet owner in the sign-up process. In doing so they enter the pets name, age, favourite treat. This information will be used to match pets with pet minders in addition to the information of the pet owner which was already entered during sign-up.

### Edit / Remove Pet Profile (Pet Owner)
Pet owners can update or remove their pet profiles when details change or when the pet no longer needs services i.e. when it dies.

### Create / Maintain Minder Profile (Pet Minder)
Once registered the user will be prompted to create a minder profile, if they have selected that they are a pet minder in the sign-up process. In doing so they enter the preferred pet types, experience. This information will be used to match pets with pet minders in addition to the information of the pet minder which was already entered during sign-up.

### Set / Change Availability (Pet Minder)
Pet minders specify their availability so that pet owners can determine when services can be provided.

### Seach for a minder (Pet Owner)
Pet owners can search for suitable pet minders based on their and their pet’s information previously entered. The results will be based on minders they have previously used, their location, etc.

### Browse minder profile, testimonials and reviews (Pet Owner)
When selecting a minder, pet owners can view minders profiles where they can see their public info, such as name experience, rating and testimonials.

### Request a booking (Pet Owner)
Pet Owners request a booking by specifying the service they want, on what day and time and the pet(s) involved. This formalised the intent to hire a pet minder.

### Accept and decline a booking (Pet minder)
Pet minders review their booking requests on a regular basis and choose which bookings they accept and which they decline.

### Cancel / reschedule a booking (Pet Owner, Pet Minder)
Either the pet minder or owner can cancel the booking up to 48 hours prior to the bookings if they need to.

### Provide care instructions (Pet Owner)
Pet owners can specify their care instructions for the pet(s) in the session. This could include medication dose and time, feeding times etc.

### View instructions (Pet Minder)
Pet minders view the pet care instructions given by the owner before and or during the session to ensure quality of service.

### Start an activity (Pet Minder)
Pet minders can begin an activity such as a walk, feeding.

### View live / completed activities (Pet Owner)
Pet owners can view the completed / live activities taking place at any time to ensure their pet is being looked after as they requested.

### End activity (Pet Minder)
Pet minders can end an activity after completion.

### Rate and review a minder (Pet Owner)
After a booking is completed, pet owners can rate the pet minder out of 5 and leave a review. These will be aggregated into an average score which will be displayed on the pet minders profile.

### Rate and review the owner (Pet Minder)
After a booking is completed, pet minders can rate the pet owner out of 5 and leave a review. These will be aggregated into an average score which will be displayed on the pet owner’s profile.

## Competing software

### Overview
There are several existing software solutions that aim to assist pet owners in finding suitable individuals to look after their pets. These services are typically portrayed as digital marketplaces, connecting pet owners with individuals offering pet care services and providing basic functionality such as booking, messaging, and reviews.
Although these platforms are effective at connecting pet owners with service providers, they generally offer limited support for personalised care requirements, detailed owner instructions, and real-time visibility during pet activities. Once a service has begun, owners often have minimal insight into how their pet is being cared for. This section evaluates existing competing software by examining their strengths and weaknesses, to support the design decisions proposed for the Petminder application.

### Competitor Classification Scale
Competing software in this section will be assessed using the following scale:
* **Tier 1 – Direct competitors:** These are existing solutions that function as dedicated pet-minding platforms like this one. They allow owners to review pet minders through either a mobile or web application.
* **Tier 2 – Indirect Competitors:** These are existing solutions that function with a different intent to a pet-minding platform. However, they have similar features and partial support for pet care.

### Tier 1 Competitors

#### Rover
Rover is one of the most dominant platforms in the space and one of our main competitors. Rover allows pet owners to find pet sitters and dog walkers based on location, availability, and user reviews. They operate globally across the US, Canada, the UK and Europe. Both pet owners and minders create individual profiles, with all bookings and payments managed centrally through the platform.

* **Provided functionality:** Searching for pet sitters and dog walkers by location, User profiles with ratings and reviews, In-app messaging, Booking and payment management.
* **Advantages:** Large and established user base, Strong trust model through reviews and ratings, Simple and familiar booking workflow.
* **Disadvantages:** Limited ability for owners to specify detailed care instructions, No real-time transparency during walks or visits, Focuses primarily on service booking rather than monitoring pet welfare.
* **Key Takeaway:** Rover’s success proves that there is indeed a demand for digital pet-minding, but its specific approach isn’t suitable for owners who wish for high quality care and real-time verification of their pet’s safety.

#### Pawshake
Pawshake is another major competitor to the petminder software being developed. It’s an international pet-sitting platform that has features like: dog walking, home visits, and overnight stays. The platform places emphasis on sitter profiles (an online identity assigned after a detailed background check) and testimonials to build trust within the community.

* **Provided functionality:** Pet sitter discovery based on availability and location, Detailed sitter profiles and testimonials, Messaging between pet owners and minders, Insurance coverage for bookings.
* **Advantages:** Encourages more detailed sitter profiles, Community-oriented approach, Insurance increases user confidence.
* **Disadvantages:** Limited monitoring of pet activities once care has started, No live tracking or route selection, Owner instructions are not actively enforced or tracked.
* **Key Takeaway:** While Pawshake builds excellent pre-booking trust, it fails to provide the tools necessary to maintain that trust through active, monitored care during the service itself.

#### Wag!
Wag! is a high-speed, on-demand platform designed for pet owners who need immediate assistance rather than long-term planning. It caters towards independent walkers and users who need an on-demand service rather than something more long term. While, it includes features like GPS tracking (showing the walker's path on a map) and photo updates (visual proof of the pet's safety), the focus remains on rapid service delivery rather than deep, personalized care routines.

* **Provided functionality:** On-demand and scheduled dog walking, Basic GPS tracking during walks, Ratings and reviews of walkers, In-app payments.
* **Advantages:** Fast and convenient booking process, Introduces basic walk tracking, Suitable for short-notice services.
* **Disadvantages:** Tracking functionality is limited in detail, No support for customised walking routes, Minimal support for pet-specific routines or detailed care instructions.
* **Key takeaway:** Wag! demonstrates that owners value tracking, yet its implementation is a "black box" regarding the actual quality and specifics of the interaction, leaving a need for more granular data.

#### TrustedHousesitters
TrustedHousesitters is a platform that connects pet owners with sitters who care for pets in exchange for accommodation rather than payment. It is primarily used for longer-term pet care, such as when owners are travelling.

* **Provided functionality:** Profile-based matching between owners and sitters, Reviews and references, Messaging between users.
* **Advantages:** Cost-effective for pet owners, Emphasises trust through references and reviews, Suitable for long-term care arrangements.
* **Disadvantages:** Not suitable for short-term or on-demand services, No live tracking or activity monitoring, No structured scheduling or care instruction enforcement.
* **Key takeaway:** TrustedHousesitters focuses on long-term arrangements and trust-based exchanges but neglects than active monitoring or short-term care, highlighting a gap that the proposed solution addresses.

### Tier 2 Competitors

#### Community and Social Media Platforms
Many pet owners bypass dedicated apps entirely, opting for local Facebook and WhatsApp groups instead. These are informal unsupervised groups where people help each other out.

* **Advantages:** Easily accessible, Based on local community trust.
* **Disadvantages:** No verification of pet minders, No booking, tracking, or accountability mechanisms, No structured review system.

#### GPS Pet Tracking Applications
Standalone GPS pet tracking applications allow owners to monitor their pet’s location but do not support booking or care coordination. There are many services that provide this feature, such as Tractive [4], Pawfit 3 [5], Fi Smart Dog Collar [6]. They all have similar advantages and disadvantages:

* **Advantages:** Provides real-time location tracking, Improves owner reassurance.
* **Disadvantages:** No integration with pet minders, No scheduling or booking features, Does not support care instructions or service management.

### Comparative Analysis

| Feature | Rover | Pawshake | Wag! | TrustedHousesitters | Petminder (Proposed) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Pet Minder Discovery | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ratings & Reviews | ✓ | ✓ | ✓ | ✓ | ✓ |
| Booking & Scheduling | ✓ | ✓ | ✓ | ✓ | ✓ |
| Real Time Activity Monitoring | ✓ | ✗ | ✓ | ✗ | ✓ |
| Enforced/Supervised Actions | ✗ | ✗ | Basic | ✗ | Advanced |

### Summary and Justification
The analysis of existing competing software shows that current pet-minding platforms are effective at organising bookings and establishing trust through reviews. While existing services are great at finding help, they are lacking when it comes to verifying the quality of help in real-time. Owners are forced to trust that instructions are followed without any real-time verification or enforcement.

The proposed Pet minder solution is designed to address these limitations by combining the core functionality of existing platforms with enhanced features focused on pet welfare and owner reassurance. By supporting detailed care instructions, pet-specific profiles, and live activity tracking, the proposed application offers a more comprehensive and transparent solution within the pet-minding domain. These features are directly justified by gaps identified in existing competing software.

## Domain Model

<img width="1673" height="861" alt="domain-model" src="https://github.com/user-attachments/assets/9fd63c04-0669-4424-bfa8-4e17b94d2f3d" />


### References

[1] "General Data Protection Regulation (GDPR)," *General Data Protection Regulation (GDPR)*, 2024. [Online]. Available: https://gdpr-info.eu/art-6-gdpr/.

[2] B. Webb, "The Impact of Covid-19 On Companian Animal Welfare," Battersea, 2020. [Online]. Available: https://bdch.org.uk/files/BATTERSEA-Covid-Research-Report.pdf.

[3] A. Powell and B. Francis-Devine, "UK labour market statistics," UK Parliament, 2026. [Online]. Available: http://commonslibrary.parliament.uk/research-briefings/cbp-9366/.

[4] Tractive, "Official Website." [Online]. Available: https://tractive.com/. [Accessed: 08-Feb-2026].

[5] Pawfit, "Official Website." [Online]. Available: https://www.pawfit.com/en-gb/. [Accessed: 08-Feb-2026].

[6] TryFi, "Official Website." [Online]. Available: https://tryfi.com/. [Accessed: 08-Feb-2026].
